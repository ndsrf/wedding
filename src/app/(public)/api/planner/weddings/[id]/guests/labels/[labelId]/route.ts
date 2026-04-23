/**
 * Planner - Single Guest Label API
 *
 * PATCH  /api/planner/weddings/:id/guests/labels/:labelId  — Update a label
 * DELETE /api/planner/weddings/:id/guests/labels/:labelId  — Delete a label
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { updateLabelHandler, deleteLabelHandler, handleGuestApiError } from '@/lib/guests/api-handlers';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

const missingPlannerId = (): NextResponse => {
  const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' } };
  return NextResponse.json(body, { status: 403 });
};

interface RouteParams {
  params: Promise<{ id: string; labelId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return missingPlannerId();
    const { id: weddingId, labelId } = await context.params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    const body = await request.json();
    return updateLabelHandler(labelId, weddingId, body);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'update label' });
  }
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return missingPlannerId();
    const { id: weddingId, labelId } = await context.params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    return deleteLabelHandler(labelId, weddingId);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'delete label' });
  }
}
