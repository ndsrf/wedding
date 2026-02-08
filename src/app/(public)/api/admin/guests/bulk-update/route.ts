/**
 * Wedding Admin - Bulk Update Guests API Route
 *
 * PATCH /api/admin/guests/bulk-update - Update properties for multiple families at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

// Validation schema for request body
const bulkUpdateSchema = z.object({
  family_ids: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    preferred_language: z.enum(['ES', 'EN', 'FR', 'IT', 'DE']).optional(),
    channel_preference: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).nullable().optional(),
    invited_by_admin_id: z.string().uuid().nullable().optional(),
    set_all_attending: z.boolean().optional(),
    set_all_not_attending: z.boolean().optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  ).refine(
    (data) => !(data.set_all_attending && data.set_all_not_attending),
    { message: 'Cannot set both attending and not attending' }
  ),
});

/**
 * PATCH /api/admin/guests/bulk-update
 * Update multiple families at once
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication and require wedding_admin role
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Wedding ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { family_ids, updates } = bulkUpdateSchema.parse(body);

    // Verify all families belong to the current wedding
    const families = await prisma.family.findMany({
      where: {
        id: { in: family_ids },
        wedding_id: user.wedding_id,
      },
      select: { id: true },
    });

    if (families.length !== family_ids.length) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'One or more families do not belong to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Verify invited_by_admin_id exists if provided
    if (updates.invited_by_admin_id !== undefined && updates.invited_by_admin_id !== null) {
      const admin = await prisma.weddingAdmin.findFirst({
        where: {
          id: updates.invited_by_admin_id,
          wedding_id: user.wedding_id,
        },
      });

      if (!admin) {
        const response: APIResponse = {
          success: false,
          error: {
            code: API_ERROR_CODES.NOT_FOUND,
            message: 'Admin not found',
          },
        };
        return NextResponse.json(response, { status: 404 });
      }
    }

    // Perform bulk update in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let updatedFamilies = 0;
      let updatedMembers = 0;

      // Build family update data
      const familyUpdateData: Record<string, unknown> = {};
      if (updates.preferred_language !== undefined) {
        familyUpdateData.preferred_language = updates.preferred_language;
      }
      if (updates.channel_preference !== undefined) {
        familyUpdateData.channel_preference = updates.channel_preference;
      }
      if (updates.invited_by_admin_id !== undefined) {
        familyUpdateData.invited_by_admin_id = updates.invited_by_admin_id;
      }

      // Update families if there are family-level updates
      if (Object.keys(familyUpdateData).length > 0) {
        const familyResult = await tx.family.updateMany({
          where: { id: { in: family_ids } },
          data: familyUpdateData,
        });
        updatedFamilies = familyResult.count;
      } else {
        updatedFamilies = family_ids.length;
      }

      // Update members' attending status if requested
      if (updates.set_all_attending !== undefined || updates.set_all_not_attending !== undefined) {
        const memberResult = await tx.familyMember.updateMany({
          where: { family_id: { in: family_ids } },
          data: {
            attending: updates.set_all_attending ? true : updates.set_all_not_attending ? false : null,
          },
        });
        updatedMembers = memberResult.count;
      }

      return { updatedFamilies, updatedMembers };
    });

    const response: APIResponse = {
      success: true,
      data: {
        updated_families: result.updatedFamilies,
        updated_members: result.updatedMembers,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    // Handle authentication errors
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (errorMessage.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Wedding admin role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid request data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error bulk updating families:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update families',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
