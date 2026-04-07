/**
 * Admin Tasting Menu API
 * GET  /api/admin/tasting  - Get tasting menu (with sections, dishes, participants)
 * POST /api/admin/tasting  - Create or update tasting menu
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { getTastingMenuHandler, upsertTastingMenuHandler } from '@/lib/tasting/api-handlers';

export async function GET(request: NextRequest) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  const menuId = request.nextUrl.searchParams.get('menuId') ?? undefined;
  return getTastingMenuHandler(user.wedding_id, menuId);
}

export async function POST(request: NextRequest) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  return upsertTastingMenuHandler(user.wedding_id, request);
}
