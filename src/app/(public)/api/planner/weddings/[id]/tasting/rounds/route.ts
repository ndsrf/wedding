/**
 * Planner Tasting Rounds API
 * GET  /api/planner/weddings/[id]/tasting/rounds  - List all tasting rounds
 * POST /api/planner/weddings/[id]/tasting/rounds  - Create a new tasting round
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { getAllRoundsHandler, createRoundHandler } from '@/lib/tasting/api-handlers';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No planner' } }, { status: 403 });
  const { id: weddingId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  return getAllRoundsHandler(weddingId);
}

export async function POST(_request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No planner' } }, { status: 403 });
  const { id: weddingId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  return createRoundHandler(weddingId);
}
