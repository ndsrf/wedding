/**
 * Wedding Planner - Single Payment API Route
 *
 * PATCH /api/planner/weddings/:id/payments/:paymentId - Update payment status
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/payments/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { updatePaymentHandler, handlePaymentApiError } from '@/lib/payments/api-handlers';

const missingPlannerId = (): NextResponse => {
  const body: APIResponse = {
    success: false,
    error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' },
  };
  return NextResponse.json(body, { status: 403 });
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return missingPlannerId();
    const { id: weddingId, paymentId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    const body = await request.json();
    return updatePaymentHandler(weddingId, paymentId, body, user.id);
  } catch (error) {
    return handlePaymentApiError(error, { operation: 'update payment' });
  }
}
