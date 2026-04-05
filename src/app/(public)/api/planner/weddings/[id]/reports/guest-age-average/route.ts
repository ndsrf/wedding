/**
 * Guest Age Average Report API — Planner (per-wedding)
 * GET /api/planner/weddings/[id]/reports/guest-age-average
 */

import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { ageAverageReportHandler } from '@/lib/reports/api-handlers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id!, weddingId);
    if (denied) return denied;
    return ageAverageReportHandler(req, weddingId);
  } catch (error) {
    console.error('Error generating age average report:', error);
    return Response.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
