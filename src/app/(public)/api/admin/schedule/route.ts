/**
 * Admin Wedding Schedule API (thin wrapper)
 *
 * GET    /api/admin/schedule  — fetch schedule + blocks
 * POST   /api/admin/schedule  — apply template or create block/stage/reorder
 * PATCH  /api/admin/schedule  — update schedule, block, or stage
 * DELETE /api/admin/schedule  — delete block or stage
 *
 * Business logic lives in src/lib/schedule/api-handlers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import {
  getScheduleHandler,
  postScheduleHandler,
  patchScheduleHandler,
  deleteScheduleHandler,
} from '@/lib/schedule/api-handlers';

function handleError(err: unknown, label: string): NextResponse {
  if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 422 });
  const msg = (err as Error).message ?? '';
  if (msg.includes('Unauthorized') || msg.includes('Forbidden')) {
    return NextResponse.json({ error: msg }, { status: 401 });
  }
  console.error(`[schedule admin ${label}]`, err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return NextResponse.json({ error: 'No wedding assigned' }, { status: 400 });
    return await getScheduleHandler(user.wedding_id);
  } catch (err) {
    return handleError(err, 'GET');
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return NextResponse.json({ error: 'No wedding assigned' }, { status: 400 });

    const body = await req.json();

    // apply_template needs the planner_id from the wedding record
    let plannerId = '';
    if (body.type === 'apply_template') {
      const w = await prisma.wedding.findUnique({
        where: { id: user.wedding_id },
        select: { planner_id: true },
      });
      plannerId = w?.planner_id ?? '';
    }

    return await postScheduleHandler(user.wedding_id, plannerId, body);
  } catch (err) {
    return handleError(err, 'POST');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return NextResponse.json({ error: 'No wedding assigned' }, { status: 400 });
    const body = await req.json();
    return await patchScheduleHandler(user.wedding_id, body);
  } catch (err) {
    return handleError(err, 'PATCH');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireRole('wedding_admin');
    const body = await req.json();
    return await deleteScheduleHandler(body);
  } catch (err) {
    return handleError(err, 'DELETE');
  }
}
