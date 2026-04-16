/**
 * Wedding Admin - Single Payment API Route
 *
 * PATCH /api/admin/payments/:id - Update payment status or details
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/payments/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { updatePaymentHandler, handlePaymentApiError } from '@/lib/payments/api-handlers';

const missingWeddingId = (): NextResponse => {
  const body: APIResponse = {
    success: false,
    error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' },
  };
  return NextResponse.json(body, { status: 403 });
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return missingWeddingId();
    const { id: paymentId } = await params;
    const body = await request.json();
    return updatePaymentHandler(user.wedding_id, paymentId, body, user.id);
  } catch (error) {
    return handlePaymentApiError(error, { operation: 'update payment' });
  }
}
