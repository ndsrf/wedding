/**
 * Planner Tasting Report PDF
 * GET /api/planner/weddings/[id]/tasting/report
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { generateTastingReportHandler } from '@/lib/tasting/pdf-handlers';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'No planner' } },
      { status: 403 },
    );
  }
  const { id: weddingId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  const menuId = request.nextUrl.searchParams.get('menuId') ?? undefined;
  return generateTastingReportHandler(weddingId, menuId);
}
