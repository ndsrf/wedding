/**
 * Wedding Admin - Guest Export API Route
 *
 * GET /api/admin/guests/export  — Export guest list to Excel or CSV
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/guests/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { exportGuestsHandler, handleGuestApiError } from '@/lib/guests/api-handlers';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } };
      return NextResponse.json(body, { status: 403 });
    }
    return exportGuestsHandler(user.wedding_id, new URL(request.url).searchParams);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'export guest list' });
  }
}
