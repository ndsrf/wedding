/**
 * Generate Best Menu API (Planner)
 *
 * POST /api/planner/weddings/[id]/tasting/menu/generate
 *
 * Uses AI to select the best combination of dishes from the existing tasting menu
 * based on desired quantities per course and the wedding date/location context.
 *
 * Body:
 *   { appetizers: number, first_course: number, second_course: number, dessert: number }
 *
 * Response:
 *   { success: true, data: { selectedDishIds: string[], reasoning?: string } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { prisma } from '@/lib/db/prisma';
import { generateBestMenu } from '@/lib/ai/menu-generator';

const generateMenuSchema = z.object({
  appetizers: z.number().int().min(0).max(20),
  first_course: z.number().int().min(0).max(20),
  second_course: z.number().int().min(0).max(20),
  dessert: z.number().int().min(0).max(20),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No planner' } },
        { status: 403 },
      );
    }

    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    const body = await request.json();
    const parsed = generateMenuSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const { appetizers, first_course, second_course, dessert } = parsed.data;
    const total = appetizers + first_course + second_course + dessert;
    if (total === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one dish quantity must be greater than 0' } },
        { status: 400 },
      );
    }

    // Fetch wedding context and all available dishes
    const [wedding, tastingMenu] = await Promise.all([
      prisma.wedding.findUnique({
        where: { id: weddingId },
        select: { wedding_date: true, location: true },
      }),
      prisma.tastingMenu.findUnique({
        where: { wedding_id: weddingId },
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
        },
      }),
    ]);

    if (!tastingMenu) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No tasting menu found for this wedding' } },
        { status: 404 },
      );
    }

    // Flatten dishes with computed average scores and section names
    const dishes = tastingMenu.sections.flatMap(section =>
      section.dishes.map(dish => {
        const scores = dish.scores ?? [];
        const average_score =
          scores.length > 0
            ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / scores.length) * 10) / 10
            : null;
        return {
          id: dish.id,
          name: dish.name,
          description: dish.description,
          average_score,
          section_name: section.name,
        };
      }),
    );

    if (dishes.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_DISHES', message: 'No dishes available in the tasting menu' } },
        { status: 422 },
      );
    }

    const result = await generateBestMenu({
      dishes,
      quantities: {
        appetizers,
        first_course,
        second_course,
        dessert,
      },
      weddingDate: wedding?.wedding_date?.toISOString() ?? null,
      location: wedding?.location ?? null,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: 'GENERATION_FAILED', message: 'AI could not generate a menu. Check AI provider configuration.' } },
        { status: 500 },
      );
    }

    // Validate that returned IDs exist in this wedding's dishes
    const validIds = new Set(dishes.map(d => d.id));
    const selectedDishIds = result.selectedDishIds.filter(id => validIds.has(id));

    return NextResponse.json({
      success: true,
      data: { selectedDishIds, reasoning: result.reasoning },
    });
  } catch (error) {
    console.error('[GENERATE_MENU] Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate menu' } },
      { status: 500 },
    );
  }
}
