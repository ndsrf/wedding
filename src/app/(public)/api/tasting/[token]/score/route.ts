/**
 * Public Tasting Score API
 * POST /api/tasting/[token]/score  - Save or update a dish score
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';

type Params = { params: Promise<{ token: string }> };

const scoreSchema = z.object({
  dish_id: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;

  const participant = await prisma.tastingParticipant.findUnique({
    where: { magic_token: token },
  });

  if (!participant) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Invalid tasting link' } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = scoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });
  }

  // Verify dish belongs to this participant's menu
  const dish = await prisma.tastingDish.findFirst({
    where: { id: parsed.data.dish_id, section: { menu_id: participant.menu_id } },
  });
  if (!dish) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Dish not found' } }, { status: 404 });
  }

  const score = await prisma.tastingScore.upsert({
    where: { participant_id_dish_id: { participant_id: participant.id, dish_id: parsed.data.dish_id } },
    create: {
      participant_id: participant.id,
      dish_id: parsed.data.dish_id,
      score: parsed.data.score,
      notes: parsed.data.notes ?? null,
    },
    update: {
      score: parsed.data.score,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({ success: true, data: score });
}
