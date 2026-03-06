/**
 * Admin Tasting Dish Detail API
 * PUT    /api/admin/tasting/dishes/[id]  - Update dish
 * DELETE /api/admin/tasting/dishes/[id]  - Delete dish
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const updateDishSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  description: z.string().max(1000).nullable().optional(),
  order: z.number().int().min(0).optional(),
});

type Params = { params: Promise<{ id: string }> };

async function checkOwnership(dishId: string, weddingId: string) {
  return prisma.tastingDish.findFirst({
    where: { id: dishId, section: { menu: { wedding_id: weddingId } } },
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const { id } = await params;
  const dish = await checkOwnership(id, user.wedding_id);
  if (!dish) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Dish not found' } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateDishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });
  }

  const updated = await prisma.tastingDish.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const { id } = await params;
  const dish = await checkOwnership(id, user.wedding_id);
  if (!dish) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Dish not found' } }, { status: 404 });
  }

  await prisma.tastingDish.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
