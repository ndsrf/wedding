/**
 * Planner Tasting Participant Detail API
 * PUT    /api/planner/weddings/[id]/tasting/participants/[participantId] - Update
 * DELETE /api/planner/weddings/[id]/tasting/participants/[participantId] - Remove
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

type Params = { params: Promise<{ id: string; participantId: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  whatsapp_number: z.string().max(50).optional().or(z.literal('')),
  channel_preference: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).nullable().optional(),
  language: z.enum(['ES', 'EN', 'FR', 'IT', 'DE']).optional(),
});

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id: weddingId, participantId } = await params;
  const participant = await prisma.tastingParticipant.findFirst({
    where: { id: participantId, menu: { wedding_id: weddingId, wedding: { planner_id: user.planner_id } } },
  });
  if (!participant) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });

  const updated = await prisma.tastingParticipant.update({
    where: { id: participantId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.email !== undefined && { email: parsed.data.email || null }),
      ...(parsed.data.phone !== undefined && { phone: parsed.data.phone || null }),
      ...(parsed.data.whatsapp_number !== undefined && { whatsapp_number: parsed.data.whatsapp_number || null }),
      ...(parsed.data.channel_preference !== undefined && { channel_preference: parsed.data.channel_preference }),
      ...(parsed.data.language !== undefined && { language: parsed.data.language }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

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
