/**
 * Admin Tasting Menu API
 * GET  /api/admin/tasting  - Get tasting menu (with sections, dishes, participants)
 * POST /api/admin/tasting  - Create or update tasting menu
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { computeEffectiveStatus } from '@/lib/tasting/status';

const upsertMenuSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  tasting_date: z.string().datetime({ offset: true }).optional().nullable(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

export async function GET() {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }

  const [menuData, wedding] = await Promise.all([
    prisma.tastingMenu.findUnique({
      where: { wedding_id: user.wedding_id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            dishes: {
              orderBy: { order: 'asc' },
              include: { scores: { select: { score: true } } },
            },
          },
        },
        participants: { orderBy: { created_at: 'asc' } },
      },
    }),
    prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { default_language: true },
    }),
  ]);

  let menu = menuData as unknown;

  if (menuData) {
    const sections = menuData.sections.map((section) => ({
      ...section,
      dishes: section.dishes.map((dish) => {
        const scores = dish.scores || [];
        const avg = scores.length > 0
          ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 10) / 10
          : null;
        return { ...dish, average_score: avg, score_count: scores.length };
      }),
    }));
    const effective_status = computeEffectiveStatus(menuData.status, menuData.tasting_date);
    menu = { ...menuData, sections, effective_status };
  }

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

  const { tasting_date, ...rest } = parsed.data;
  const data = {
    ...rest,
    tasting_date: tasting_date ? new Date(tasting_date) : tasting_date === null ? null : undefined,
  };

  const menu = await prisma.tastingMenu.upsert({
    where: { wedding_id: user.wedding_id },
    create: { wedding_id: user.wedding_id, ...data },
    update: data,
  });

  const effective_status = computeEffectiveStatus(menu.status, menu.tasting_date);
  return NextResponse.json({ success: true, data: { ...menu, effective_status } });
}
