/**
 * Wedding Admin – Seating Layout API Route
 *
 * POST /api/admin/seating/layout – save canvas layout and table positions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import { saveLayoutHandler } from '@/lib/seating/api-handlers';

export async function POST(request: NextRequest) {
  const user = await requireRole('wedding_admin');

  if (!user.wedding_id) {
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } },
      { status: 403 }
    );
  }

  return saveLayoutHandler(user.wedding_id, request);
}
