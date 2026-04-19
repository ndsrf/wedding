/**
 * Wedding Admin — Delete API Key
 *
 * DELETE /api/admin/api-keys/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole('wedding_admin');
    const { id } = await params;

    const key = await prisma.weddingApiKey.findUnique({ where: { id } });
    if (!key || key.wedding_id !== user.wedding_id) {
      return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.NOT_FOUND, message: 'API key not found' } }, { status: 404 });
    }

    await prisma.weddingApiKey.delete({ where: { id } });

    const response: APIResponse = { success: true };
    return NextResponse.json(response);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) {
      return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } }, { status: 401 });
    }
    if (msg.includes('FORBIDDEN')) {
      return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding admin role required' } }, { status: 403 });
    }
    console.error('[API-KEYS] DELETE error:', error);
    return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Internal error' } }, { status: 500 });
  }
}
