/**
 * Shared Menu API Handlers
 *
 * Business logic for menu selection operations, shared between the admin
 * (/api/admin/tasting/menu) and planner
 * (/api/planner/weddings/[id]/tasting/menu) routes.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { exportWeddingMenu } from '@/lib/reports/export';
import type { ExportFormat } from '@/lib/excel/export';

/**
 * Update the selected dishes for a wedding's tasting menu.
 *
 * PUT /api/admin/tasting/menu
 * PUT /api/planner/weddings/[id]/tasting/menu
 */
export async function updateMenuSelectionHandler(
  weddingId: string,
  body: unknown,
): Promise<NextResponse> {
  const { selectedDishIds } = body as Record<string, unknown>;

  if (!Array.isArray(selectedDishIds)) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid data' } },
      { status: 400 },
    );
  }

  const tastingMenu = await prisma.tastingMenu.findFirst({
    where: { wedding_id: weddingId },
    select: { id: true },
  });

  if (!tastingMenu) {
    return NextResponse.json(
      { success: false, error: { message: 'Tasting menu not found' } },
      { status: 404 },
    );
  }

  await prisma.$transaction([
    prisma.tastingDish.updateMany({
      where: { section: { menu_id: tastingMenu.id } },
      data: { is_selected: false },
    }),
    prisma.tastingDish.updateMany({
      where: { id: { in: selectedDishIds as string[] } },
      data: { is_selected: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}

/**
 * Export the wedding menu selection to Excel/CSV.
 *
 * GET /api/admin/tasting/menu/export
 * GET /api/planner/weddings/[id]/tasting/menu/export
 */
export async function exportMenuHandler(
  weddingId: string,
  format: ExportFormat,
): Promise<NextResponse> {
  const result = await exportWeddingMenu(weddingId, format);

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  });
}
