/**
 * Wedding Admin - Delete All Guests API Route
 *
 * DELETE /api/admin/guests/delete-all - Delete all families for a wedding
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

/**
 * DELETE /api/admin/guests/delete-all
 * Delete all families for the current wedding
 */
export async function DELETE(_request: NextRequest) {
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

    // Delete all families in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get all family IDs for the wedding
      const families = await tx.family.findMany({
        where: { wedding_id: user.wedding_id },
        select: { id: true },
      });

      const familyIds = families.map((f) => f.id);

      if (familyIds.length === 0) {
        return { deletedFamilies: 0, deletedMembers: 0 };
      }

      // Delete family members first
      const deletedMembers = await tx.familyMember.deleteMany({
        where: { family_id: { in: familyIds } },
      });

      // Delete families
      const deletedFamilies = await tx.family.deleteMany({
        where: { id: { in: familyIds } },
      });

      return {
        deletedFamilies: deletedFamilies.count,
        deletedMembers: deletedMembers.count,
      };
    });

    const response: APIResponse = {
      success: true,
      data: {
        deleted_families: result.deletedFamilies,
        deleted_members: result.deletedMembers,
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

    // Handle unexpected errors
    console.error('Error deleting all families:', error);
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
