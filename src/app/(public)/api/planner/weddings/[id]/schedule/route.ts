/**
 * Planner Wedding Schedule API (thin wrapper)
 *
 * GET    /api/planner/weddings/[id]/schedule
 * POST   /api/planner/weddings/[id]/schedule
 * PATCH  /api/planner/weddings/[id]/schedule
 * DELETE /api/planner/weddings/[id]/schedule
 *
 * Business logic lives in src/lib/schedule/api-handlers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import {
  getScheduleHandler,
  postScheduleHandler,
  patchScheduleHandler,
  deleteScheduleHandler,
} from '@/lib/schedule/api-handlers';

type Params = { params: Promise<{ id: string }> };

function handleError(err: unknown, label: string): NextResponse {
  if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 422 });
  const msg = (err as Error).message ?? '';
  if (msg.includes('Unauthorized') || msg.includes('Forbidden')) {
    return NextResponse.json({ error: msg }, { status: 401 });
  }
  console.error(`[schedule planner ${label}]`, err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'No planner' }, { status: 403 });
    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    return await getScheduleHandler(weddingId);
  } catch (err) {
    return handleError(err, 'GET');
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'No planner' }, { status: 403 });
    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    const body = await req.json();
    return await postScheduleHandler(weddingId, user.planner_id, body);
  } catch (err) {
    return handleError(err, 'POST');
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'No planner' }, { status: 403 });
    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    const body = await req.json();
    return await patchScheduleHandler(weddingId, body);
  } catch (err) {
    return handleError(err, 'PATCH');
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'No planner' }, { status: 403 });
    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    const body = await req.json();
    return await deleteScheduleHandler(body);
  } catch (err) {
    return handleError(err, 'DELETE');
  }
}
