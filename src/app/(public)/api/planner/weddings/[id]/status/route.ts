/**
 * Wedding Planner - Wedding Status Management API
 *
 * PATCH /api/planner/weddings/:id/status - Update wedding status (disable/enable/delete/undelete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { invalidateCache, CACHE_KEYS } from '@/lib/cache/redis';
import type {
  APIResponse,
  UpdateWeddingStatusResponse,
} from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { WeddingStatus } from '@prisma/client';

// Validation schema for status updates
const updateStatusSchema = z.object({
  action: z.enum(['disable', 'enable', 'delete', 'undelete'], {
    error: 'Invalid action. Must be one of: disable, enable, delete, undelete',
  }),
});

/**
 * PATCH /api/planner/weddings/:id/status
 * Update wedding status (disable/enable/delete/undelete)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and require planner role
    const user = await requireRole('planner');

    if (!user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const { id: weddingId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateStatusSchema.safeParse(body);

    if (!validationResult.success) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: validationResult.error.issues[0]?.message || 'Invalid input',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { action } = validationResult.data;

    // Fetch wedding to verify ownership
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: {
        id: true,
        planner_id: true,
        status: true,
        is_disabled: true,
        disabled_at: true,
        deleted_at: true,
        license_deleted: true,
      },
    });

    if (!wedding) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Wedding not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if wedding belongs to this planner
    if (wedding.planner_id !== user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'You do not have access to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Perform the requested action
    let updatedWedding;

    switch (action) {
      case 'disable':
        // Don't disable if already disabled (idempotent)
        if (wedding.is_disabled) {
          updatedWedding = wedding;
        } else {
          updatedWedding = await prisma.wedding.update({
            where: { id: weddingId },
            data: {
              is_disabled: true,
              disabled_at: new Date(),
              disabled_by: user.planner_id,
            },
            select: {
              id: true,
              status: true,
              is_disabled: true,
              disabled_at: true,
              deleted_at: true,
            },
          });
        }
        break;

      case 'enable':
        // Don't enable if not disabled (idempotent)
        if (!wedding.is_disabled) {
          updatedWedding = wedding;
        } else {
          updatedWedding = await prisma.wedding.update({
            where: { id: weddingId },
            data: {
              is_disabled: false,
              disabled_at: null,
              disabled_by: null,
            },
            select: {
              id: true,
              status: true,
              is_disabled: true,
              disabled_at: true,
              deleted_at: true,
            },
          });
        }
        break;

      case 'delete':
        // Don't delete if already deleted (idempotent)
        if (wedding.status === WeddingStatus.DELETED) {
          updatedWedding = wedding;
        } else {
          updatedWedding = await prisma.wedding.update({
            where: { id: weddingId },
            data: {
              status: WeddingStatus.DELETED,
              deleted_at: new Date(),
              deleted_by: user.planner_id,
            },
            select: {
              id: true,
              status: true,
              is_disabled: true,
              disabled_at: true,
              deleted_at: true,
            },
          });
        }
        break;

      case 'undelete':
        // Don't undelete if not deleted
        if (wedding.status !== WeddingStatus.DELETED) {
          const response: APIResponse = {
            success: false,
            error: {
              code: API_ERROR_CODES.VALIDATION_ERROR,
              message: 'Wedding is not deleted',
            },
          };
          return NextResponse.json(response, { status: 400 });
        }

        // Block restore if deleted due to license downgrade
        if (wedding.license_deleted) {
          const response: APIResponse = {
            success: false,
            error: {
              code: API_ERROR_CODES.FORBIDDEN,
              message: 'This wedding was removed due to a license limit reduction and cannot be restored. Please contact support to upgrade your plan.',
            },
          };
          return NextResponse.json(response, { status: 403 });
        }

        // Before reactivating, ensure none of this wedding's admins have an
        // email or phone that conflicts with admins already in active weddings.
        // This preserves cross-tenant uniqueness used for WhatsApp routing.
        {
          const adminsToRestore = await prisma.weddingAdmin.findMany({
            where: { wedding_id: weddingId },
            select: { id: true, email: true, phone: true, name: true },
          });

          const emails = adminsToRestore.map((a) => a.email);
          const phones = adminsToRestore
            .map((a) => a.phone)
            .filter((p): p is string => p !== null);

          const [emailConflicts, phoneConflicts] = await Promise.all([
            emails.length > 0
              ? prisma.weddingAdmin.findMany({
                  where: {
                    email: { in: emails },
                    wedding_id: { not: weddingId },
                    wedding: { status: WeddingStatus.ACTIVE },
                  },
                  select: { email: true },
                })
              : Promise.resolve([]),
            phones.length > 0
              ? prisma.weddingAdmin.findMany({
                  where: {
                    phone: { in: phones },
                    wedding_id: { not: weddingId },
                    wedding: { status: WeddingStatus.ACTIVE },
                  },
                  select: { phone: true },
                })
              : Promise.resolve([]),
          ]);

          if (emailConflicts.length > 0) {
            const conflictingEmails = emailConflicts.map((a) => a.email).join(', ');
            const response: APIResponse = {
              success: false,
              error: {
                code: API_ERROR_CODES.CONFLICT,
                message: `Cannot reactivate: the following admin email(s) are already registered in another active wedding: ${conflictingEmails}`,
              },
            };
            return NextResponse.json(response, { status: 409 });
          }

          if (phoneConflicts.length > 0) {
            const conflictingPhones = phoneConflicts.map((a) => a.phone).join(', ');
            const response: APIResponse = {
              success: false,
              error: {
                code: API_ERROR_CODES.CONFLICT,
                message: `Cannot reactivate: the following admin phone number(s) are already registered in another active wedding: ${conflictingPhones}`,
              },
            };
            return NextResponse.json(response, { status: 409 });
          }
        }

        updatedWedding = await prisma.wedding.update({
          where: { id: weddingId },
          data: {
            status: WeddingStatus.ACTIVE,
            deleted_at: null,
            deleted_by: null,
          },
          select: {
            id: true,
            status: true,
            is_disabled: true,
            disabled_at: true,
            deleted_at: true,
          },
        });
        break;

      default:
        // This should never happen due to zod validation
        const response: APIResponse = {
          success: false,
          error: {
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid action',
          },
        };
        return NextResponse.json(response, { status: 400 });
    }

    await Promise.all([
      invalidateCache(CACHE_KEYS.plannerStats(user.planner_id)),
      invalidateCache(CACHE_KEYS.plannerUpcomingTasks(user.planner_id)),
      invalidateCache(CACHE_KEYS.plannerWeddingDetail(weddingId)),
      invalidateCache(CACHE_KEYS.plannerWeddingsList(user.planner_id)),
      invalidateCache(CACHE_KEYS.adminWedding(weddingId)),
      invalidateCache(CACHE_KEYS.adminDashboard(weddingId)),
    ]);

    const response: UpdateWeddingStatusResponse = {
      success: true,
      data: updatedWedding,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating wedding status:', error);

    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to update wedding status',
      },
    };

    return NextResponse.json(response, { status: 500 });
  }
}
