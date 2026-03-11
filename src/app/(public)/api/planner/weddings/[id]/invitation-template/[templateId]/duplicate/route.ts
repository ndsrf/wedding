/**
 * Planner Invitation Template Duplicate API
 *
 * POST /api/planner/weddings/[id]/invitation-template/[templateId]/duplicate
 *
 * Auth-and-dispatch thin wrapper; business logic lives in
 * src/lib/invitation-template/api-handlers.ts.
 *
 * This endpoint was previously missing on the planner side, causing the
 * duplicate feature to be unavailable to planners.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import {
  duplicateInvitationTemplateHandler,
  handleInvitationTemplateApiError,
} from '@/lib/invitation-template/api-handlers';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  try {
    const { id: weddingId, templateId } = await params;
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json({ error: 'Planner ID not found in session' }, { status: 403 });
    }

    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    return duplicateInvitationTemplateHandler(weddingId, templateId);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}
