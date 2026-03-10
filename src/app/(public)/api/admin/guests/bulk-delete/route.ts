/**
 * Wedding Admin - Bulk Delete Guests API Route
 *
 * DELETE /api/admin/guests/bulk-delete  — Delete multiple families at once
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/guests/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { bulkDeleteGuestsHandler, handleGuestApiError } from '@/lib/guests/api-handlers';

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } };
      return NextResponse.json(body, { status: 403 });
    }
    const body = await request.json();
    return bulkDeleteGuestsHandler(user.wedding_id, body);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'bulk delete families' });
  }
}
