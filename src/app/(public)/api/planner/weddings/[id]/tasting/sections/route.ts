/**
 * Planner Tasting Sections API
 * POST /api/planner/weddings/[id]/tasting/sections
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

type Params = { params: Promise<{ id: string }> };

const createSectionSchema = z.object({ name: z.string().min(1).max(200) });

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No planner' } }, { status: 403 });

  const { id: weddingId } = await params;
  const wedding = await prisma.wedding.findFirst({ where: { id: weddingId, planner_id: user.planner_id } });
  if (!wedding) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Wedding not found' } }, { status: 404 });

  const body = await request.json();
  const parsed = createSectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });

  const menu = await prisma.tastingMenu.upsert({
    where: { wedding_id: weddingId },
    create: { wedding_id: weddingId, title: 'Tasting Menu' },
    update: {},
  });

  const maxOrder = await prisma.tastingSection.aggregate({ where: { menu_id: menu.id }, _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const section = await prisma.tastingSection.create({
    data: { menu_id: menu.id, name: parsed.data.name, order: nextOrder },
    include: { dishes: true },
  });

  return NextResponse.json({ success: true, data: section }, { status: 201 });
}
