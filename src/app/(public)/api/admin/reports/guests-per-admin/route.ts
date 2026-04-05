/**
 * Guests Per Admin Report API — Admin
 * GET /api/admin/reports/guests-per-admin
 */

import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { guestsPerAdminReportHandler } from '@/lib/reports/api-handlers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      return Response.json({ error: 'No wedding associated with this account' }, { status: 400 });
    }
    return guestsPerAdminReportHandler(req, user.wedding_id);
  } catch (error) {
    console.error('Error generating guests per admin report:', error);
    return Response.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
