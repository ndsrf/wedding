/**
 * Admin Tasting Menu Import API
 * POST /api/admin/tasting/import
 *
 * Accepts a PDF or image file and uses AI vision to extract the menu structure.
 * Returns sections and dishes — does NOT persist anything.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { importTastingMenuHandler } from '@/lib/tasting/api-handlers';

export async function POST(request: NextRequest) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }
  return importTastingMenuHandler(request);
}
