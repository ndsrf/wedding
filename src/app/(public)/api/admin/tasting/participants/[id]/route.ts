/**
 * Admin Tasting Participant Detail API
 * PUT    /api/admin/tasting/participants/[id]  - Update participant
 * DELETE /api/admin/tasting/participants/[id]  - Remove participant
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  whatsapp_number: z.string().max(50).optional().or(z.literal('')),
  channel_preference: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).nullable().optional(),
  language: z.enum(['ES', 'EN', 'FR', 'IT', 'DE']).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
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

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });
  }

  const updated = await prisma.tastingParticipant.update({
    where: { id },
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
