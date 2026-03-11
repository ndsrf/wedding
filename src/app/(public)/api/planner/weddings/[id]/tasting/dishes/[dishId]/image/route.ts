/**
 * Planner Tasting Dish Image API
 * POST   /api/planner/weddings/[id]/tasting/dishes/[dishId]/image
 * DELETE /api/planner/weddings/[id]/tasting/dishes/[dishId]/image
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { uploadDishImageHandler, deleteDishImageHandler } from '@/lib/tasting/api-handlers';

type Params = { params: Promise<{ id: string; dishId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  const { id: weddingId, dishId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  return uploadDishImageHandler(dishId, weddingId, request);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  const { id: weddingId, dishId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  return deleteDishImageHandler(dishId, weddingId);
}
