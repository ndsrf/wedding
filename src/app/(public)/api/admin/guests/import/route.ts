/**
 * Wedding Admin - Guest Import API Route
 *
 * POST /api/admin/guests/import  — Upload and import guest list from Excel file
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/guests/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { importGuestsHandler, handleGuestApiError } from '@/lib/guests/api-handlers';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } };
      return NextResponse.json(body, { status: 403 });
    }
    return importGuestsHandler(user.wedding_id, request);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'import guest list' });
  }
}
