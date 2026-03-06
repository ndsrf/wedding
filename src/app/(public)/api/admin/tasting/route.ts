/**
 * Admin Tasting Menu API
 * GET  /api/admin/tasting  - Get tasting menu (with sections, dishes, participants)
 * POST /api/admin/tasting  - Create or update tasting menu
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const upsertMenuSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export async function GET() {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const [menu, wedding] = await Promise.all([
    prisma.tastingMenu.findUnique({
      where: { wedding_id: user.wedding_id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { dishes: { orderBy: { order: 'asc' } } },
        },
        participants: { orderBy: { created_at: 'asc' } },
      },
    }),
    prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { default_language: true },
    }),
  ]);

  return NextResponse.json({ success: true, data: menu, wedding_language: wedding?.default_language ?? 'ES' });
}

export async function POST(request: NextRequest) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const body = await request.json();
  const parsed = upsertMenuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });
  }

  const menu = await prisma.tastingMenu.upsert({
    where: { wedding_id: user.wedding_id },
    create: { wedding_id: user.wedding_id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ success: true, data: menu });
}
