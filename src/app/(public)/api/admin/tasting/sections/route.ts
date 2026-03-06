/**
 * Admin Tasting Sections API
 * GET  /api/admin/tasting/sections  - List sections
 * POST /api/admin/tasting/sections  - Create section
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const createSectionSchema = z.object({
  name: z.string().min(1).max(200),
});

async function getOrCreateMenu(weddingId: string) {
  return prisma.tastingMenu.upsert({
    where: { wedding_id: weddingId },
    create: { wedding_id: weddingId, title: 'Tasting Menu' },
    update: {},
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });
    }

    const menu = await getOrCreateMenu(user.wedding_id);

    const maxOrder = await prisma.tastingSection.aggregate({
      where: { menu_id: menu.id },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const section = await prisma.tastingSection.create({
      data: { menu_id: menu.id, name: parsed.data.name, order: nextOrder },
      include: { dishes: true },
    });

    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (error) {
    console.error('Error creating tasting section:', error);
    const message = error instanceof Error ? error.message : 'Failed to create section';
    return NextResponse.json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message }
    }, { status: 500 });
  }
}
