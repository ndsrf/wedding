/**
 * Wedding Admin - Guest Invitation Link API Route
 *
 * GET /api/admin/guests/:id/inv-link  — Get the /inv/ short URL for a family
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/guests/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { getGuestInvLinkHandler, handleGuestApiError } from '@/lib/guests/api-handlers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } };
      return NextResponse.json(body, { status: 403 });
    }
    const { id: familyId } = await context.params;
    return getGuestInvLinkHandler(familyId, user.wedding_id);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'fetch invitation link' });
  }
}
