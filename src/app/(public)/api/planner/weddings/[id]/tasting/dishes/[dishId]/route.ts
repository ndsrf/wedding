/**
 * Planner Tasting Dish Detail API
 * PUT    /api/planner/weddings/[id]/tasting/dishes/[dishId]
 * DELETE /api/planner/weddings/[id]/tasting/dishes/[dishId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

type Params = { params: Promise<{ id: string; dishId: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).nullable().optional(),
  order: z.number().int().min(0).optional(),
});

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id: weddingId, dishId } = await params;
  const dish = await prisma.tastingDish.findFirst({
    where: { id: dishId, section: { menu: { wedding_id: weddingId, wedding: { planner_id: user.planner_id } } } },
  });
  if (!dish) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });

  const updated = await prisma.tastingDish.update({ where: { id: dishId }, data: parsed.data });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id: weddingId, dishId } = await params;
  const dish = await prisma.tastingDish.findFirst({
    where: { id: dishId, section: { menu: { wedding_id: weddingId, wedding: { planner_id: user.planner_id } } } },
  });
  if (!dish) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

  await prisma.tastingDish.delete({ where: { id: dishId } });
  return NextResponse.json({ success: true });
}
