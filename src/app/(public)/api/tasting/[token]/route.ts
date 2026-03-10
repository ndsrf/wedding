/**
 * Public Tasting Menu API - Participant View
 * GET /api/tasting/[token]
 *
 * Returns the full tasting menu with all sections, dishes,
 * the participant's own scores, and all participants' scores.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { computeEffectiveStatus } from '@/lib/tasting/status';

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;

  const participant = await prisma.tastingParticipant.findUnique({
    where: { magic_token: token },
    include: {
      menu: {
        include: {
          wedding: { select: { couple_names: true, default_language: true } },
          sections: {
            orderBy: { order: 'asc' },
            include: {
              dishes: {
                orderBy: { order: 'asc' },
                include: {
                  scores: {
                    include: {
                      participant: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
          participants: {
            select: { id: true, name: true },
            orderBy: { created_at: 'asc' },
          },
        },
      },
      scores: true,
    },
  });

  if (!participant) {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Invalid or expired tasting link' } }, { status: 404 });
  }

  // Build response with computed averages per dish
  const menu = participant.menu;
  const sectionsWithAverages = menu.sections.map((section) => ({
    ...section,
    dishes: section.dishes.map((dish) => {
      const scores = dish.scores;
      const avg = scores.length > 0
        ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 10) / 10
        : null;
      return { ...dish, average_score: avg, score_count: scores.length };
    }),
  }));

  const effective_status = computeEffectiveStatus(menu.status, menu.tasting_date);

  return NextResponse.json({
    success: true,
    data: {
      participant: {
        id: participant.id,
        name: participant.name,
      },
      menu: {
        id: menu.id,
        title: menu.title,
        description: menu.description,
        tasting_date: menu.tasting_date,
        status: menu.status,
        effective_status,
        wedding: menu.wedding,
        sections: sectionsWithAverages,
        participants: menu.participants,
      },
      my_scores: participant.scores.reduce<Record<string, { score: number; notes: string | null; image_url: string | null }>>((acc, s) => {
        acc[s.dish_id] = { score: s.score, notes: s.notes, image_url: s.image_url };
        return acc;
      }, {}),
    },
  });
}
