/**
 * Admin Invitation Template Detail API — Get, Update & Delete
 *
 * GET    /api/admin/invitation-template/[id]
 * PUT    /api/admin/invitation-template/[id]
 * DELETE /api/admin/invitation-template/[id]
 *
 * Auth-and-dispatch thin wrapper; business logic lives in
 * src/lib/invitation-template/api-handlers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import {
  getInvitationTemplateHandler,
  updateInvitationTemplateHandler,
  deleteInvitationTemplateHandler,
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

    return await getInvitationTemplateHandler(user.wedding_id, templateId);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}

export async function PUT(
  req: NextRequest,
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

    const body = await req.json();
    return await updateInvitationTemplateHandler(user.wedding_id, templateId, body);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}

export async function DELETE(
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

    return await deleteInvitationTemplateHandler(user.wedding_id, templateId);
  } catch (error) {
    return handleInvitationTemplateApiError(error);
  }
}
