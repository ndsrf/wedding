/**
 * Wedding Admin - Bulk Delete Guests API Route
 *
 * DELETE /api/admin/guests/bulk-delete - Delete multiple families at once
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
 * DELETE /api/admin/guests/bulk-delete
 * Delete multiple families at once
 */
export async function DELETE(request: NextRequest) {
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
    const { family_ids } = bulkDeleteSchema.parse(body);

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
