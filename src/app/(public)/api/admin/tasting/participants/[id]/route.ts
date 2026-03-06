/**
 * Admin Tasting Participant Detail API
 * DELETE /api/admin/tasting/participants/[id]  - Remove participant
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const { id } = await params;
  const participant = await prisma.tastingParticipant.findFirst({
    where: { id, menu: { wedding_id: user.wedding_id } },
  });
  if (!participant) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Participant not found' } }, { status: 404 });
  }

  await prisma.tastingParticipant.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
