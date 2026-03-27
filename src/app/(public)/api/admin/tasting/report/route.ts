/**
 * Admin Tasting Report PDF
 * GET /api/admin/tasting/report
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { generateTastingReportHandler } from '@/lib/tasting/pdf-handlers';

export async function GET() {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } },
      { status: 403 },
    );
  }
  return generateTastingReportHandler(user.wedding_id);
}
