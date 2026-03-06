/**
 * Planner Tasting Dishes API
 * POST /api/planner/weddings/[id]/tasting/dishes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

type Params = { params: Promise<{ id: string }> };

const createDishSchema = z.object({
  section_id: z.string().uuid(),
  name: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id: weddingId } = await params;
  const body = await request.json();
  const parsed = createDishSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });

  const section = await prisma.tastingSection.findFirst({
    where: { id: parsed.data.section_id, menu: { wedding_id: weddingId, wedding: { planner_id: user.planner_id } } },
  });
  if (!section) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Section not found' } }, { status: 404 });

  const maxOrder = await prisma.tastingDish.aggregate({ where: { section_id: parsed.data.section_id }, _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const dish = await prisma.tastingDish.create({
    data: { section_id: parsed.data.section_id, name: parsed.data.name, description: parsed.data.description, order: nextOrder },
  });

  return NextResponse.json({ success: true, data: dish }, { status: 201 });
}
