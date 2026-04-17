/**
 * Planner - Delete All Guests API Route
 *
 * DELETE /api/planner/weddings/:id/guests/delete-all
 *
 * Mirrors /api/admin/guests/delete-all but scoped to a planner-owned wedding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' } },
        { status: 403 }
      );
    }

    const { id: weddingId } = await params;

    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    const result = await prisma.$transaction(async (tx) => {
      const deletedMembers = await tx.familyMember.deleteMany({
        where: { family: { wedding_id: weddingId } },
      });

      const deletedFamilies = await tx.family.deleteMany({
        where: { wedding_id: weddingId },
      });

      return {
        deletedFamilies: deletedFamilies.count,
        deletedMembers: deletedMembers.count,
      };
    });

    return NextResponse.json<APIResponse>(
      { success: true, data: { deleted_families: result.deletedFamilies, deleted_members: result.deletedMembers } },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } },
        { status: 401 }
      );
    }
    if (msg.includes('FORBIDDEN')) {
      return NextResponse.json<APIResponse>(
        { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner role required' } },
        { status: 403 }
      );
    }
    console.error('Error deleting all guests for planner:', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to delete families' } },
      { status: 500 }
    );
  }
}
