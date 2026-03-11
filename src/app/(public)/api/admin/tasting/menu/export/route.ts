/**
 * Wedding Menu Export API
 *
 * GET /api/admin/tasting/menu/export - Export wedding menu selection
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { exportMenuHandler } from '@/lib/menu/api-handlers';
import type { ExportFormat } from '@/lib/excel/export';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      return NextResponse.json({ error: 'No wedding associated' }, { status: 400 });
    }
    const format = (req.nextUrl.searchParams.get('format') || 'xlsx') as ExportFormat;
    return exportMenuHandler(user.wedding_id, format);
  } catch (error) {
    console.error('Error exporting wedding menu:', error);
    return NextResponse.json({ error: 'Failed to export menu' }, { status: 500 });
  }
}
