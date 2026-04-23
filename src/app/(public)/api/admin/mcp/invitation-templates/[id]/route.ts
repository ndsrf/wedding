/**
 * MCP — Invitation Template by ID (get + update)
 * GET /api/admin/mcp/invitation-templates/[id]
 * PUT /api/admin/mcp/invitation-templates/[id]
 * Auth: Bearer API key (wedding_admin role)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKeyAuth } from '@/lib/auth/api-key';
import {
  getInvitationTemplateHandler,
  updateInvitationTemplateHandler,
  handleInvitationTemplateApiError,
} from '@/lib/invitation-template/api-handlers';

async function withAuth(request: NextRequest) {
  const ctx = await requireApiKeyAuth(request, 'wedding_admin');
  if (!ctx.wedding_id) throw new Error('FORBIDDEN: No wedding context');
  return ctx.wedding_id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const weddingId = await withAuth(request);
    const { id } = await params;
    return getInvitationTemplateHandler(weddingId, id);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return handleInvitationTemplateApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const weddingId = await withAuth(request);
    const { id } = await params;
    const body = await request.json();
    return updateInvitationTemplateHandler(weddingId, id, body);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return handleInvitationTemplateApiError(error);
  }
}
