/**
 * Wedding Admin — API Keys
 *
 * GET    /api/admin/api-keys  — List API keys for this wedding admin (no raw key)
 * POST   /api/admin/api-keys  — Replace all existing keys and create a new one (returns raw key once)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { generateApiKey, hashApiKey, defaultExpiresAt } from '@/lib/auth/api-key';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

function handleError(error: unknown) {
  const msg = error instanceof Error ? error.message : '';
  if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' } }, { status: 401 });
  if (msg.includes('FORBIDDEN')) return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding admin role required' } }, { status: 403 });
  console.error('[API-KEYS] error:', error);
  return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Internal error' } }, { status: 500 });
}

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');
    const keys = await prisma.weddingApiKey.findMany({
      where: { wedding_id: user.wedding_id, role: 'wedding_admin' },
      select: { id: true, name: true, created_at: true, last_used_at: true, expires_at: true },
      orderBy: { created_at: 'desc' },
    });
    const response: APIResponse<typeof keys> = { success: true, data: keys };
    return NextResponse.json(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    const { name } = await request.json() as { name?: string };
    const keyName = (name?.trim()) || 'Claude Desktop';

    // Delete all existing keys for this wedding admin
    await prisma.weddingApiKey.deleteMany({
      where: { wedding_id: user.wedding_id, role: 'wedding_admin' },
    });

    const rawKey = generateApiKey();
    const expiresAt = defaultExpiresAt();

    const record = await prisma.weddingApiKey.create({
      data: {
        name: keyName,
        key_hash: hashApiKey(rawKey),
        role: 'wedding_admin',
        wedding_id: user.wedding_id,
        planner_id: user.planner_id,
        expires_at: expiresAt,
      },
    });

    const response: APIResponse<{ id: string; name: string; key: string; expires_at: Date }> = {
      success: true,
      data: { id: record.id, name: record.name, key: rawKey, expires_at: expiresAt },
    };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
