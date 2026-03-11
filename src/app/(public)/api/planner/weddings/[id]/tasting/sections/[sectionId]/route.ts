/**
 * Planner Tasting Section Detail API
 * PUT    /api/planner/weddings/[id]/tasting/sections/[sectionId]
 * DELETE /api/planner/weddings/[id]/tasting/sections/[sectionId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { updateSectionHandler, deleteSectionHandler } from '@/lib/tasting/api-handlers';

type Params = { params: Promise<{ id: string; sectionId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  const { id: weddingId, sectionId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  return updateSectionHandler(sectionId, weddingId, request);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  const { id: weddingId, sectionId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  return deleteSectionHandler(sectionId, weddingId);
}
