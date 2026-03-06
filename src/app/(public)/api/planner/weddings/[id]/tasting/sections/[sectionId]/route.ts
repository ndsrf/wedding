/**
 * Planner Tasting Section Detail API
 * PUT    /api/planner/weddings/[id]/tasting/sections/[sectionId]
 * DELETE /api/planner/weddings/[id]/tasting/sections/[sectionId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

type Params = { params: Promise<{ id: string; sectionId: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  order: z.number().int().min(0).optional(),
});

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id: weddingId, sectionId } = await params;
  const section = await prisma.tastingSection.findFirst({
    where: { id: sectionId, menu: { wedding_id: weddingId, wedding: { planner_id: user.planner_id } } },
  });
  if (!section) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });

  const updated = await prisma.tastingSection.update({
    where: { id: sectionId },
    data: parsed.data,
    include: { dishes: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id: weddingId, sectionId } = await params;
  const section = await prisma.tastingSection.findFirst({
    where: { id: sectionId, menu: { wedding_id: weddingId, wedding: { planner_id: user.planner_id } } },
  });
  if (!section) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

  await prisma.tastingSection.delete({ where: { id: sectionId } });
  return NextResponse.json({ success: true });
}
