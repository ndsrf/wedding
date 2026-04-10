/**
 * Planner Tasting Menu Import API
 * POST /api/planner/weddings/[id]/tasting/import
 *
 * Accepts a PDF or image file and uses AI vision to extract the menu structure.
 * Returns sections and dishes — does NOT persist anything.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { importTastingMenuHandler } from '@/lib/tasting/api-handlers';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireRole('planner');
  if (!user.planner_id) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  const { id: weddingId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;
  return importTastingMenuHandler(request, weddingId, user.planner_id);
}
