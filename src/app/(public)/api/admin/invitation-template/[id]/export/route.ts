/**
 * Admin Invitation Template Export API
 *
 * GET /api/admin/invitation-template/[id]/export
 *
 * Auth-and-dispatch thin wrapper; business logic lives in
 * src/lib/invitation-template/api-handlers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import {
  exportInvitationTemplateHandler,
  handleInvitationTemplateApiError,
} from '@/lib/invitation-template/api-handlers';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: templateId } = await params;
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID not found in user context' },
        { status: 400 },
      );
    }

    return exportInvitationTemplateHandler(user.wedding_id, templateId);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}
