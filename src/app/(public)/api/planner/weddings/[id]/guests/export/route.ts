/**
 * Wedding Planner - Guest Export API Route
 *
 * GET /api/planner/weddings/:id/guests/export  — Export guest list to Excel or CSV
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/guests/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { exportGuestsHandler, handleGuestApiError } from '@/lib/guests/api-handlers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' } };
      return NextResponse.json(body, { status: 403 });
    }
    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    return exportGuestsHandler(weddingId, new URL(request.url).searchParams);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'export guest list' });
  }
}
