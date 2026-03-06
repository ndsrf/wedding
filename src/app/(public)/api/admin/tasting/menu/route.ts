/**
 * Wedding Menu Selection API
 *
 * PUT /api/admin/tasting/menu - Update wedding menu selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function PUT(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      return NextResponse.json({ success: false, error: { message: 'No wedding associated' } }, { status: 400 });
    }

    const { selectedDishIds } = await req.json();

    if (!Array.isArray(selectedDishIds)) {
      return NextResponse.json({ success: false, error: { message: 'Invalid data' } }, { status: 400 });
    }

    // Update all dishes for this wedding's tasting menu
    // First, find the tasting menu id
    const tastingMenu = await prisma.tastingMenu.findFirst({
      where: { wedding_id: user.wedding_id },
      select: { id: true }
    });

    if (!tastingMenu) {
      return NextResponse.json({ success: false, error: { message: 'Tasting menu not found' } }, { status: 404 });
    }

    // Transaction to update all dishes
    await prisma.$transaction([
      // Set all to false first
      prisma.tastingDish.updateMany({
        where: { section: { menu_id: tastingMenu.id } },
        data: { is_selected: false }
      }),
      // Set selected to true
      prisma.tastingDish.updateMany({
        where: { id: { in: selectedDishIds } },
        data: { is_selected: true }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating wedding menu:', error);
    return NextResponse.json({ success: false, error: { message: 'Failed to update menu' } }, { status: 500 });
  }
}
