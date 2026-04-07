/**
 * Admin Tasting Rounds API
 * GET  /api/admin/tasting/rounds  - List all tasting rounds for this wedding
 * POST /api/admin/tasting/rounds  - Create a new tasting round
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { getAllRoundsHandler, createRoundHandler } from '@/lib/tasting/api-handlers';

export async function GET() {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  return getAllRoundsHandler(user.wedding_id);
}

export async function POST() {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  return createRoundHandler(user.wedding_id);
}
