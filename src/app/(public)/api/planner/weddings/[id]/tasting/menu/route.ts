/**
 * Wedding Menu Selection API (Planner)
 *
 * PUT /api/planner/weddings/[id]/tasting/menu - Update wedding menu selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: weddingId } = await params;
    await requireRole('planner');

    const { selectedDishIds } = await req.json();

    if (!Array.isArray(selectedDishIds)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid data' } }, { status: 400 });
    }

    // Find the tasting menu id
    const tastingMenu = await prisma.tastingMenu.findFirst({
      where: { wedding_id: weddingId },
      select: { id: true }
    });

    if (!tastingMenu) {
      return NextResponse.json({ success: false, error: { message: 'Tasting menu not found' } }, { status: 404 });
    }

    // Transaction to update all dishes
    await prisma.$transaction([
      prisma.tastingDish.updateMany({
        where: { section: { menu_id: tastingMenu.id } },
        data: { is_selected: false }
      }),
      prisma.tastingDish.updateMany({
        where: { id: { in: selectedDishIds } },
        data: { is_selected: true }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating wedding menu (planner):', error);
    return NextResponse.json({ success: false, error: { message: 'Failed to update menu' } }, { status: 500 });
  }
}
