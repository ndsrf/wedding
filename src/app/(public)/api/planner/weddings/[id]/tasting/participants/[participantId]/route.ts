/**
 * Planner Tasting Participant Detail API
 * DELETE /api/planner/weddings/[id]/tasting/participants/[participantId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

type Params = { params: Promise<{ id: string; participantId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id: weddingId, participantId } = await params;
  const participant = await prisma.tastingParticipant.findFirst({
    where: { id: participantId, menu: { wedding_id: weddingId, wedding: { planner_id: user.planner_id } } },
  });
  if (!participant) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

  await prisma.tastingParticipant.delete({ where: { id: participantId } });
  return NextResponse.json({ success: true });
}
