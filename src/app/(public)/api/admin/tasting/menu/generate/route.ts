/**
 * Generate Best Menu API (Admin)
 *
 * POST /api/admin/tasting/menu/generate
 *
 * Uses AI to select the best combination of dishes from the existing tasting menu
 * based on:
 *   - Desired quantities per course
 *   - Tasting scores (average + number of raters per dish)
 *   - Wedding date, location and country (season / regional cuisine)
 *   - Guest profile: average age of attending family members, guest count,
 *     and aggregated dietary restrictions
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
import { prisma } from '@/lib/db/prisma';
import { generateBestMenu } from '@/lib/ai/menu-generator';

const generateMenuSchema = z.object({
  appetizers: z.number().int().min(0).max(20),
  first_course: z.number().int().min(0).max(20),
  second_course: z.number().int().min(0).max(20),
  dessert: z.number().int().min(0).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'No wedding associated' } },
        { status: 403 },
      );
    }

    const weddingId = user.wedding_id;

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

    // Fetch wedding context, tasting menu, and guest profile in parallel
    const [wedding, tastingMenu, guestMembers] = await Promise.all([
      prisma.wedding.findUnique({
        where: { id: weddingId },
        select: { wedding_date: true, location: true, wedding_country: true, default_language: true },
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
      // Collect ages and dietary restrictions from all family members of this wedding
      prisma.familyMember.findMany({
        where: { family: { wedding_id: weddingId } },
        select: { age: true, dietary_restrictions: true },
      }),
    ]);

    if (!tastingMenu) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No tasting menu found for this wedding' } },
        { status: 404 },
      );
    }

    // ── Build guest context ──────────────────────────────────────────────────
    const ages = guestMembers.map(m => m.age).filter((a): a is number => a != null && a > 0);
    const averageAge = ages.length > 0
      ? Math.round((ages.reduce((s, a) => s + a, 0) / ages.length) * 10) / 10
      : null;

    // Aggregate dietary restrictions: split on common delimiters, lowercase, deduplicate
    const allRestrictions = guestMembers
      .flatMap(m =>
        (m.dietary_restrictions ?? '')
          .split(/[,;\/\n]+/)
          .map(r => r.trim().toLowerCase())
          .filter(r => r.length > 0),
      );
    const dietaryRestrictions = [...new Set(allRestrictions)];

    const guestContext = {
      totalGuests: guestMembers.length,
      averageAge,
      dietaryRestrictions,
    };

    // ── Flatten dishes with computed average scores ──────────────────────────
    const dishes = tastingMenu.sections.flatMap(section =>
      section.dishes.map(dish => {
        const scores = dish.scores ?? [];
        const score_count = scores.length;
        const average_score =
          score_count > 0
            ? Math.round((scores.reduce((sum, s) => sum + s.score, 0) / score_count) * 10) / 10
            : null;
        return {
          id: dish.id,
          name: dish.name,
          description: dish.description,
          average_score,
          score_count,
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
      quantities: { appetizers, first_course, second_course, dessert },
      weddingDate: wedding?.wedding_date?.toISOString() ?? null,
      location: wedding?.location ?? null,
      weddingCountry: wedding?.wedding_country ?? null,
      language: wedding?.default_language ?? null,
      guestContext,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: 'GENERATION_FAILED', message: 'AI could not generate a menu. Check AI provider configuration.' } },
        { status: 500 },
      );
    }

    // Validate that returned IDs belong to this wedding's dishes
    const validIds = new Set(dishes.map(d => d.id));
    const selectedDishIds = result.selectedDishIds.filter(id => validIds.has(id));

    return NextResponse.json({
      success: true,
      data: { selectedDishIds, reasoning: result.reasoning },
    });
  } catch (error) {
    console.error('[GENERATE_MENU_ADMIN] Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate menu' } },
      { status: 500 },
    );
  }
}
