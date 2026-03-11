/**
 * Wedding Planner - Single Guest API Route
 *
 * GET    /api/planner/weddings/:id/guests/:guestId  — Get family details with members
 * PATCH  /api/planner/weddings/:id/guests/:guestId  — Update family and members
 * DELETE /api/planner/weddings/:id/guests/:guestId  — Delete family
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/guests/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import {
  getGuestHandler,
  updateGuestHandler,
  deleteGuestHandler,
  handleGuestApiError,
} from '@/lib/guests/api-handlers';

interface RouteParams {
  params: Promise<{ id: string; guestId: string }>;
}

const missingPlannerId = (): NextResponse => {
  const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' } };
  return NextResponse.json(body, { status: 403 });
};

export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return missingPlannerId();
    const { id: weddingId, guestId: familyId } = await context.params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    return getGuestHandler(familyId, weddingId);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'fetch family' });
  }
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return missingPlannerId();
    const { id: weddingId, guestId: familyId } = await context.params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    const body = await request.json();
    return updateGuestHandler(familyId, weddingId, body, user.id);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'update family' });
  }
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return missingPlannerId();
    const { id: weddingId, guestId: familyId } = await context.params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    return deleteGuestHandler(familyId, weddingId, user.id);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'delete family' });
  }
}
