/**
 * Admin Tasting Sections API
 * POST /api/admin/tasting/sections  - Create section
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { createSectionHandler } from '@/lib/tasting/api-handlers';

export async function POST(request: NextRequest) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding' } }, { status: 403 });
  }
  return createSectionHandler(user.wedding_id, request);
}
