/**
 * Planner Attendee List Report API
 *
 * GET /api/planner/weddings/[id]/reports/attendees - Generate attendee list report
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { exportAttendeeList, fetchAttendeeList } from '@/lib/reports/export';
import type { ExportFormat } from '@/lib/excel/export';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user as planner
    await requireRole('planner');

    // Get wedding ID from URL params
    const { id: wedding_id } = await context.params;

    if (!wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID is required' },
        { status: 400 }
      );
    }

    // Get format from query params
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') as ExportFormat | 'json' | null;

    // If format is json or not specified, return JSON data
    if (!format || format === 'json') {
      const data = await fetchAttendeeList(wedding_id);
      return NextResponse.json(data);
    }

    // Generate report
    const result = await exportAttendeeList(wedding_id, format as ExportFormat);

    // Return file
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating attendee list report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}