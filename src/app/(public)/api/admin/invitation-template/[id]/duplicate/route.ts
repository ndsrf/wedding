/**
 * Admin Invitation Template Duplicate API
 *
 * POST /api/admin/invitation-template/[id]/duplicate
 *
 * Auth-and-dispatch thin wrapper; business logic lives in
 * src/lib/invitation-template/api-handlers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import {
  duplicateInvitationTemplateHandler,
  handleInvitationTemplateApiError,
} from '@/lib/invitation-template/api-handlers';

export async function POST(
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

    return duplicateInvitationTemplateHandler(user.wedding_id, templateId);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}
