/**
 * Wedding Menu Export API (Planner)
 *
 * GET /api/planner/weddings/[id]/tasting/menu/export - Export wedding menu selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { exportWeddingMenu } from '@/lib/reports/export';
import type { ExportFormat } from '@/lib/excel/export';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: weddingId } = await params;
    await requireRole('planner');

    const searchParams = req.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'xlsx') as ExportFormat;

    const result = await exportWeddingMenu(weddingId, format);

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting wedding menu (planner):', error);
    return NextResponse.json({ error: 'Failed to export menu' }, { status: 500 });
  }
}
