/**
 * Planner Tasting Menu API
 * GET  /api/planner/weddings/[id]/tasting
 * POST /api/planner/weddings/[id]/tasting
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { getTastingMenuHandler, upsertTastingMenuHandler } from '@/lib/tasting/api-handlers';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No planner' } }, { status: 403 });
  const { id: weddingId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  const menuId = request.nextUrl.searchParams.get('menuId') ?? undefined;
  return getTastingMenuHandler(weddingId, menuId);
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No planner' } }, { status: 403 });
  const { id: weddingId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  return upsertTastingMenuHandler(weddingId, request);
}
