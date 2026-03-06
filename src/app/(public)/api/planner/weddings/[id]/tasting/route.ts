/**
 * Planner Tasting Menu API
 * GET  /api/planner/weddings/[id]/tasting
 * POST /api/planner/weddings/[id]/tasting
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

type Params = { params: Promise<{ id: string }> };

const upsertMenuSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

async function verifyPlannerOwnership(weddingId: string, plannerId: string) {
  return prisma.wedding.findFirst({ where: { id: weddingId, planner_id: plannerId } });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No planner' } }, { status: 403 });

  const { id: weddingId } = await params;
  const wedding = await verifyPlannerOwnership(weddingId, user.planner_id);
  if (!wedding) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Wedding not found' } }, { status: 404 });

  const menu = await prisma.tastingMenu.findUnique({
    where: { wedding_id: weddingId },
    include: {
      sections: { orderBy: { order: 'asc' }, include: { dishes: { orderBy: { order: 'asc' } } } },
      participants: { orderBy: { created_at: 'asc' } },
    },
  });

  return NextResponse.json({ success: true, data: menu });
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No planner' } }, { status: 403 });

  const { id: weddingId } = await params;
  const wedding = await verifyPlannerOwnership(weddingId, user.planner_id);
  if (!wedding) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Wedding not found' } }, { status: 404 });

  const body = await request.json();
  const parsed = upsertMenuSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });

  const menu = await prisma.tastingMenu.upsert({
    where: { wedding_id: weddingId },
    create: { wedding_id: weddingId, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ success: true, data: menu });
}
