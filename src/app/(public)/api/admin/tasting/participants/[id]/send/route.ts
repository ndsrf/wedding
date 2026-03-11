/**
 * Admin Tasting - Send Link to Participant
 * POST /api/admin/tasting/participants/[id]/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { sendParticipantLinkHandler } from '@/lib/tasting/api-handlers';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  const { id } = await params;
  return sendParticipantLinkHandler(id, user.wedding_id, request);
}
