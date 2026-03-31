import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function POST() {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      // Fetch all weddings and categories for this planner in parallel
      const [weddings, categories] = await Promise.all([
        tx.wedding.findMany({
          where: { planner_id: user.planner_id! },
          select: { id: true },
        }),
        tx.providerCategory.findMany({
          where: { planner_id: user.planner_id! },
          select: { id: true },
        }),
      ]);

      if (weddings.length === 0 || categories.length === 0) {
        return { created: 0, weddings: weddings.length, categories: categories.length };
      }

      const weddingIds = weddings.map((w: { id: string }) => w.id);
      const categoryIds = categories.map((c: { id: string }) => c.id);

      // Find all existing (wedding_id, category_id) slots in one query
      const existing = await tx.weddingProvider.findMany({
        where: {
          wedding_id: { in: weddingIds },
          category_id: { in: categoryIds },
        },
        select: { wedding_id: true, category_id: true },
      });

      const existingSet = new Set(
        existing.map((e: { wedding_id: string; category_id: string }) => `${e.wedding_id}:${e.category_id}`)
      );

      // Build the list of missing (wedding, category) pairs
      const toCreate: { wedding_id: string; category_id: string }[] = [];
      for (const wedding of weddings) {
        for (const category of categories) {
          if (!existingSet.has(`${wedding.id}:${category.id}`)) {
            toCreate.push({ wedding_id: wedding.id, category_id: category.id });
          }
        }
      }

      if (toCreate.length === 0) {
        return { created: 0, weddings: weddings.length, categories: categories.length };
      }

      const { count } = await tx.weddingProvider.createMany({ data: toCreate });
      return { created: count, weddings: weddings.length, categories: categories.length };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error applying categories to weddings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
