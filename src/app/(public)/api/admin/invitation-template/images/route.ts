/**
 * Admin Invitation Template Images API
 *
 * GET  /api/admin/invitation-template/images
 * POST /api/admin/invitation-template/images
 *
 * Auth-and-dispatch thin wrapper; business logic lives in
 * src/lib/invitation-template/api-handlers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import {
  listInvitationImagesHandler,
  uploadInvitationImageHandler,
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

    return await listInvitationImagesHandler(user.wedding_id);
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

    return await uploadInvitationImageHandler(user.wedding_id, req);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}
