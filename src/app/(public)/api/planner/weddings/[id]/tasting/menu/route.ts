/**
 * Wedding Menu Selection API (Planner)
 *
 * PUT /api/planner/weddings/[id]/tasting/menu - Update wedding menu selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { updateMenuSelectionHandler } from '@/lib/menu/api-handlers';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: weddingId } = await params;
    const user = await requireRole('planner');
    const denied = await validatePlannerAccess(user.planner_id!, weddingId);
    if (denied) return denied;
    const body = await req.json();
    return updateMenuSelectionHandler(weddingId, body);
  } catch (error) {
    console.error('Error updating wedding menu (planner):', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to update menu' } },
      { status: 500 },
    );
  }
}
