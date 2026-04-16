/**
 * Wedding Admin - Payments API Route
 *
 * GET  /api/admin/payments - List all payments for wedding
 * POST /api/admin/payments - Manually record a payment
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/payments/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import {
  listPaymentsHandler,
  recordPaymentHandler,
  handlePaymentApiError,
} from '@/lib/payments/api-handlers';

const missingWeddingId = (): NextResponse => {
  const body: APIResponse = {
    success: false,
    error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' },
  };
  return NextResponse.json(body, { status: 403 });
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return missingWeddingId();
    return listPaymentsHandler(user.wedding_id, new URL(request.url).searchParams);
  } catch (error) {
    return handlePaymentApiError(error, { operation: 'fetch payments' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return missingWeddingId();
    const body = await request.json();
    return recordPaymentHandler(user.wedding_id, body, user.id);
  } catch (error) {
    return handlePaymentApiError(error, { operation: 'record payment' });
  }
}
