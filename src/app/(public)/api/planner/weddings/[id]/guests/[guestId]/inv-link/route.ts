/**
 * Wedding Planner - Guest Invitation Link API Route
 *
 * GET /api/planner/weddings/:id/guests/:guestId/inv-link - Get the /inv/ short URL for a family
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/guests/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { getGuestInvLinkHandler, handleGuestApiError } from '@/lib/guests/api-handlers';

interface RouteParams {
  params: Promise<{ id: string; guestId: string }>;
}

export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' } };
      return NextResponse.json(body, { status: 403 });
    }
    const { id: weddingId, guestId } = await context.params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    return getGuestInvLinkHandler(guestId, weddingId);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'fetch invitation link' });
  }
}
