/**
 * Planner Tasting Dish Detail API
 * PUT    /api/planner/weddings/[id]/tasting/dishes/[dishId]
 * DELETE /api/planner/weddings/[id]/tasting/dishes/[dishId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { updateDishHandler, deleteDishHandler } from '@/lib/tasting/api-handlers';

type Params = { params: Promise<{ id: string; dishId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  const { id: weddingId, dishId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  return updateDishHandler(dishId, weddingId, request);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  const { id: weddingId, dishId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  return deleteDishHandler(dishId, weddingId);
}
