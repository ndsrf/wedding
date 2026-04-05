/**
 * Natural Language Query Report API — Planner (per-wedding)
 * POST /api/planner/weddings/[id]/reports/query
 */

import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { nlQueryReportHandler } from '@/lib/reports/api-handlers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id!, weddingId);
    if (denied) return denied;
    // Use planner_id as the context ($2) — "my side" will refer to this planner's wedding admins
    return nlQueryReportHandler(req, weddingId, user.planner_id!);
  } catch (error) {
    console.error('[NL-QUERY] API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute query';
    return Response.json({ error: message }, { status: 500 });
  }
}
