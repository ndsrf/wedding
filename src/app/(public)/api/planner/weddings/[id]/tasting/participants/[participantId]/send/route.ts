/**
 * Planner - Send Tasting Link to Participant
 * POST /api/planner/weddings/[id]/tasting/participants/[participantId]/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { sendParticipantLinkHandler } from '@/lib/tasting/api-handlers';

type Params = { params: Promise<{ id: string; participantId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  const { id: weddingId, participantId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  return sendParticipantLinkHandler(participantId, weddingId, request);
}
