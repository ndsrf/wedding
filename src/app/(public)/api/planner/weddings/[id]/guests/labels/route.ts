/**
 * Planner - Guest Labels API
 *
 * GET  /api/planner/weddings/:id/guests/labels  — List all labels for the wedding
 * POST /api/planner/weddings/:id/guests/labels  — Create a new label
 */

import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { listLabelsHandler, createLabelHandler, handleGuestApiError } from '@/lib/guests/api-handlers';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { NextResponse } from 'next/server';

const missingPlannerId = (): NextResponse => {
  const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' } };
  return NextResponse.json(body, { status: 403 });
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return missingPlannerId();
    const { id: weddingId } = await context.params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    return listLabelsHandler(weddingId);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'list labels' });
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return missingPlannerId();
    const { id: weddingId } = await context.params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    const body = await request.json();
    return createLabelHandler(weddingId, body);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'create label' });
  }
}
