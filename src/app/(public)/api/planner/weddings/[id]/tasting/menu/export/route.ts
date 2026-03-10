/**
 * Wedding Menu Export API (Planner)
 *
 * GET /api/planner/weddings/[id]/tasting/menu/export - Export wedding menu selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { exportMenuHandler } from '@/lib/menu/api-handlers';
import type { ExportFormat } from '@/lib/excel/export';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: weddingId } = await params;
    const user = await requireRole('planner');
    const denied = await validatePlannerAccess(user.planner_id!, weddingId);
    if (denied) return denied;
    const format = (req.nextUrl.searchParams.get('format') || 'xlsx') as ExportFormat;
    return exportMenuHandler(weddingId, format);
  } catch (error) {
    console.error('Error exporting wedding menu (planner):', error);
    return NextResponse.json({ error: 'Failed to export menu' }, { status: 500 });
  }
}
