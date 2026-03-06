/**
 * Planner Tasting Participants API
 * POST /api/planner/weddings/[id]/tasting/participants
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

type Params = { params: Promise<{ id: string }> };

const createParticipantSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  whatsapp_number: z.string().max(50).optional().or(z.literal('')),
  channel_preference: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).optional(),
  language: z.enum(['ES', 'EN', 'FR', 'IT', 'DE']).optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id: weddingId } = await params;
  const wedding = await prisma.wedding.findFirst({ where: { id: weddingId, planner_id: user.planner_id } });
  if (!wedding) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

  const body = await request.json();
  const parsed = createParticipantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });

  const menu = await prisma.tastingMenu.upsert({
    where: { wedding_id: weddingId },
    create: { wedding_id: weddingId, title: 'Tasting Menu' },
    update: {},
  });

  const participant = await prisma.tastingParticipant.create({
    data: {
      menu_id: menu.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      whatsapp_number: parsed.data.whatsapp_number || null,
      channel_preference: parsed.data.channel_preference ?? null,
      language: parsed.data.language ?? 'ES',
    },
  });

  return NextResponse.json({ success: true, data: participant }, { status: 201 });
}
