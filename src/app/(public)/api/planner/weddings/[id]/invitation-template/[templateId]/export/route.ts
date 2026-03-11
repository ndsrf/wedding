/**
 * Planner Invitation Template Export API
 *
 * GET /api/planner/weddings/[id]/invitation-template/[templateId]/export
 *
 * Auth-and-dispatch thin wrapper; business logic lives in
 * src/lib/invitation-template/api-handlers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import {
  exportInvitationTemplateHandler,
  handleInvitationTemplateApiError,
} from '@/lib/invitation-template/api-handlers';

export async function GET(
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

    return exportInvitationTemplateHandler(weddingId, templateId);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}
