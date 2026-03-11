/**
 * Wedding Planner - Guests API Route
 *
 * GET  /api/planner/weddings/:id/guests  — List all families with filters and pagination
 * POST /api/planner/weddings/:id/guests  — Create new family
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/guests/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { listGuestsHandler, createGuestHandler, handleGuestApiError } from '@/lib/guests/api-handlers';

const missingPlannerId = (): NextResponse => {
  const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' } };
  return NextResponse.json(body, { status: 403 });
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return missingPlannerId();
    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    return listGuestsHandler(weddingId, new URL(request.url).searchParams);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'fetch guests' });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return missingPlannerId();
    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    const body = await request.json();
    return createGuestHandler(weddingId, body, user.id);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'create guest' });
  }
}
