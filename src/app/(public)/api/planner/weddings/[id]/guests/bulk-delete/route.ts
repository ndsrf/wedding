/**
 * Wedding Planner - Bulk Delete Guests API Route
 *
 * DELETE /api/planner/weddings/:id/guests/bulk-delete - Delete multiple families at once
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

// Validation schema for request body
const bulkDeleteSchema = z.object({
  family_ids: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * Helper to validate planner access to wedding
 */
async function validatePlannerAccess(plannerId: string, weddingId: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { planner_id: true },
  });

  if (!wedding) {
    return { valid: false, error: 'Wedding not found', status: 404 };
  }

  if (wedding.planner_id !== plannerId) {
    return { valid: false, error: 'You do not have access to this wedding', status: 403 };
  }

  return { valid: true };
}

/**
 * DELETE /api/planner/weddings/:id/guests/bulk-delete
 * Delete multiple families at once
 */
export async function DELETE(
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

    // Validate planner access to wedding
    const accessCheck = await validatePlannerAccess(user.planner_id, weddingId);
    if (!accessCheck.valid) {
      const response: APIResponse = {
        success: false,
        error: {
          code: accessCheck.status === 404 ? API_ERROR_CODES.NOT_FOUND : API_ERROR_CODES.FORBIDDEN,
          message: accessCheck.error!,
        },
      };
      return NextResponse.json(response, { status: accessCheck.status });
    }

    // Parse and validate request body
    const body = await request.json();
    const { family_ids } = bulkDeleteSchema.parse(body);

    // Verify all families belong to the current wedding
    const families = await prisma.family.findMany({
      where: {
        id: { in: family_ids },
        wedding_id: weddingId,
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

    // Delete all families in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete family members first (cascade should handle this, but being explicit)
      await tx.familyMember.deleteMany({
        where: { family_id: { in: family_ids } },
      });

      // Delete families
      const deletedFamilies = await tx.family.deleteMany({
        where: { id: { in: family_ids } },
      });

      return deletedFamilies.count;
    });

    const response: APIResponse = {
      success: true,
      data: {
        deleted_count: result,
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
          message: 'Planner role required',
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
    console.error('Error bulk deleting families:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to delete families',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
