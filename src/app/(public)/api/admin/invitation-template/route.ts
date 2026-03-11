/**
 * Admin Invitation Template API — List & Create
 *
 * GET  /api/admin/invitation-template
 * POST /api/admin/invitation-template
 *
 * Auth-and-dispatch thin wrapper; business logic lives in
 * src/lib/invitation-template/api-handlers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import {
  listInvitationTemplatesHandler,
  createInvitationTemplateHandler,
  handleInvitationTemplateApiError,
} from '@/lib/invitation-template/api-handlers';

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID not found in user context' },
        { status: 400 },
      );
    }

    return await listInvitationTemplatesHandler(user.wedding_id);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID not found in user context' },
        { status: 400 },
      );
    }

    const body = await req.json();
    return await createInvitationTemplateHandler(user.wedding_id, body);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}
