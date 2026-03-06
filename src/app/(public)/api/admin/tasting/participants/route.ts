/**
 * Admin Tasting Participants API
 * GET  /api/admin/tasting/participants  - List participants
 * POST /api/admin/tasting/participants  - Add participant
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const createParticipantSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  whatsapp_number: z.string().max(50).optional().or(z.literal('')),
  channel_preference: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).optional(),
});

async function getOrCreateMenu(weddingId: string) {
  return prisma.tastingMenu.upsert({
    where: { wedding_id: weddingId },
    create: { wedding_id: weddingId, title: 'Tasting Menu' },
    update: {},
  });
}

export async function GET() {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const menu = await prisma.tastingMenu.findUnique({
    where: { wedding_id: user.wedding_id },
    include: {
      participants: { orderBy: { created_at: 'asc' } },
    },
  });

  return NextResponse.json({ success: true, data: menu?.participants ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createParticipantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });
  }

  const menu = await getOrCreateMenu(user.wedding_id);

  const participant = await prisma.tastingParticipant.create({
    data: {
      menu_id: menu.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      whatsapp_number: parsed.data.whatsapp_number || null,
      channel_preference: parsed.data.channel_preference ?? null,
    },
  });

  return NextResponse.json({ success: true, data: participant }, { status: 201 });
}
