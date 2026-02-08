/**
 * Guest Age Average Report API
 *
 * GET /api/admin/reports/guest-age-average - Generate guest age average report
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { exportAgeAverage, fetchAgeAverage } from '@/lib/reports/export';
import type { ExportFormat } from '@/lib/excel/export';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        { error: 'No wedding associated with this account' },
        { status: 400 }
      );
    }

    // Get format from query params
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') as ExportFormat | 'json' | null;

    // If format is json or not specified, return JSON data
    if (!format || format === 'json') {
      const data = await fetchAgeAverage(user.wedding_id);
      return NextResponse.json(data);
    }

    // Generate report for excel/csv
    const result = await exportAgeAverage(user.wedding_id, format as ExportFormat);

    // Return file
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating age average report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
