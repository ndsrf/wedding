/**
 * MCP — Invitation Templates (list + create)
 * GET  /api/admin/mcp/invitation-templates
 * POST /api/admin/mcp/invitation-templates
 * Auth: Bearer API key (wedding_admin role)
 */

import { NextRequest } from 'next/server';
import { requireApiKeyAuth } from '@/lib/auth/api-key';
import { NextResponse } from 'next/server';
import {
  listInvitationTemplatesHandler,
  createInvitationTemplateHandler,
  handleInvitationTemplateApiError,
} from '@/lib/invitation-template/api-handlers';

async function withAuth(request: NextRequest) {
  const ctx = await requireApiKeyAuth(request, 'wedding_admin');
  if (!ctx.wedding_id) throw new Error('FORBIDDEN: No wedding context');
  return ctx.wedding_id;
}

export async function GET(request: NextRequest) {
  try {
    const weddingId = await withAuth(request);
    return listInvitationTemplatesHandler(weddingId);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return handleInvitationTemplateApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const weddingId = await withAuth(request);
    const body = await request.json();
    return createInvitationTemplateHandler(weddingId, body);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return handleInvitationTemplateApiError(error);
  }
}
