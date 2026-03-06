/**
 * Wedding Menu Export API
 *
 * GET /api/admin/tasting/menu/export - Export wedding menu selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { exportWeddingMenu } from '@/lib/reports/export';
import type { ExportFormat } from '@/lib/excel/export';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json({ error: 'No wedding associated' }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'xlsx') as ExportFormat;

    const result = await exportWeddingMenu(user.wedding_id, format);

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting wedding menu:', error);
    return NextResponse.json({ error: 'Failed to export menu' }, { status: 500 });
  }
}
