/**
 * Planner Invitation Template API — List & Create
 *
 * GET  /api/planner/weddings/[id]/invitation-template
 * POST /api/planner/weddings/[id]/invitation-template
 *
 * Auth-and-dispatch thin wrapper; business logic lives in
 * src/lib/invitation-template/api-handlers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import {
  listInvitationTemplatesHandler,
  createInvitationTemplateHandler,
  handleInvitationTemplateApiError,
} from '@/lib/invitation-template/api-handlers';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: weddingId } = await params;
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json({ error: 'Planner ID not found in session' }, { status: 403 });
    }

    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    return listInvitationTemplatesHandler(weddingId);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: weddingId } = await params;
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json({ error: 'Planner ID not found in session' }, { status: 403 });
    }

    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    const body = await req.json();
    return createInvitationTemplateHandler(weddingId, body);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}
