/**
 * Attendee List Report API — Admin
 * GET /api/admin/reports/attendees
 */

import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { attendeesReportHandler } from '@/lib/reports/api-handlers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      return Response.json({ error: 'No wedding associated with this account' }, { status: 400 });
    }
    return attendeesReportHandler(req, user.wedding_id);
  } catch (error) {
    console.error('Error generating attendee list report:', error);
    return Response.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
