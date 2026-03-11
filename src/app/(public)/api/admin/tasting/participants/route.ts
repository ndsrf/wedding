/**
 * Admin Tasting Participants API
 * GET  /api/admin/tasting/participants  - List participants
 * POST /api/admin/tasting/participants  - Add participant
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { getParticipantsHandler, createParticipantHandler } from '@/lib/tasting/api-handlers';

export async function GET() {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  return getParticipantsHandler(user.wedding_id);
}

export async function POST(request: NextRequest) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  return createParticipantHandler(user.wedding_id, request);
}
