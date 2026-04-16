/**
 * Shared Payment API Handlers
 *
 * Contains the full business logic for every payment API operation.
 * Route files (admin and planner) are thin auth-and-dispatch wrappers
 * that call these handlers after resolving the wedding ID and verifying
 * role-specific access.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import type {
  APIResponse,
  ListPaymentsResponse,
  RecordPaymentResponse,
  UpdatePaymentResponse,
} from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import type { Prisma } from '@prisma/client';

// ============================================================================
// SHARED ERROR HANDLER
// ============================================================================

export function handlePaymentApiError(
  error: unknown,
  context: { operation: string },
): NextResponse {
  const msg = error instanceof Error ? error.message : '';

  if (msg.includes('UNAUTHORIZED')) {
    const body: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' },
    };
    return NextResponse.json(body, { status: 401 });
  }

  if (msg.includes('FORBIDDEN')) {
    const body: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Access denied' },
    };
    return NextResponse.json(body, { status: 403 });
  }

  if (error instanceof z.ZodError) {
    const body: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: 'Invalid request data',
        details: error.issues,
      },
    };
    return NextResponse.json(body, { status: 400 });
  }

  console.error(`Error in ${context.operation}:`, error);
  const body: APIResponse = {
    success: false,
    error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: `Failed to ${context.operation}` },
  };
  return NextResponse.json(body, { status: 500 });
}

// ============================================================================
// LIST PAYMENTS
// ============================================================================

const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: z.enum(['PENDING', 'RECEIVED', 'CONFIRMED']).optional(),
  family_id: z.string().uuid().optional(),
});

export async function listPaymentsHandler(
  weddingId: string,
  searchParams: URLSearchParams,
): Promise<NextResponse> {
  const queryParams = listPaymentsQuerySchema.parse({
    page: searchParams.get('page') || 1,
    limit: searchParams.get('limit') || 50,
    status: searchParams.get('status') || undefined,
    family_id: searchParams.get('family_id') || undefined,
  });

  const { page, limit, status, family_id } = queryParams;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.GiftWhereInput = { wedding_id: weddingId };
  if (status) whereClause.status = status;
  if (family_id) whereClause.family_id = family_id;

  const total = await prisma.gift.count({ where: whereClause });

  const payments = await prisma.gift.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { transaction_date: 'desc' },
    include: {
      family: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const items = payments.map((p) => ({
    ...p,
    amount: Number(p.amount),
  }));

  const response: ListPaymentsResponse = {
    success: true,
    data: {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  };

  return NextResponse.json(response, { status: 200 });
}

// ============================================================================
// RECORD PAYMENT
// ============================================================================

const recordPaymentSchema = z.object({
  family_id: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  transaction_date: z.string().datetime(),
  reference_code_used: z.string().optional(),
});

export async function recordPaymentHandler(
  weddingId: string,
  body: unknown,
  actorId: string,
): Promise<NextResponse> {
  const validatedData = recordPaymentSchema.parse(body);

  const family = await prisma.family.findFirst({
    where: { id: validatedData.family_id, wedding_id: weddingId },
  });

  if (!family) {
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Family not found in this wedding' },
    };
    return NextResponse.json(response, { status: 404 });
  }

  const transactionDate = new Date(validatedData.transaction_date);
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (transactionDate > now) {
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: 'Transaction date cannot be in the future',
      },
    };
    return NextResponse.json(response, { status: 400 });
  }

  if (transactionDate < oneYearAgo) {
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: 'Transaction date cannot be more than 1 year in the past',
      },
    };
    return NextResponse.json(response, { status: 400 });
  }

  const payment = await prisma.gift.create({
    data: {
      family_id: validatedData.family_id,
      wedding_id: weddingId,
      amount: validatedData.amount,
      reference_code_used: validatedData.reference_code_used,
      auto_matched: false,
      status: 'PENDING',
      transaction_date: transactionDate,
    },
  });

  await prisma.trackingEvent.create({
    data: {
      family_id: validatedData.family_id,
      wedding_id: weddingId,
      event_type: 'PAYMENT_RECEIVED',
      metadata: {
        admin_id: actorId,
        amount: validatedData.amount,
        manual_entry: true,
      },
      admin_triggered: true,
    },
  });

  const response: RecordPaymentResponse = {
    success: true,
    data: { ...payment, amount: Number(payment.amount) },
  };

  return NextResponse.json(response, { status: 201 });
}

// ============================================================================
// UPDATE PAYMENT
// ============================================================================

const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'RECEIVED', 'CONFIRMED']).optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  transaction_date: z.string().datetime().optional(),
});

export async function updatePaymentHandler(
  weddingId: string,
  paymentId: string,
  body: unknown,
  actorId: string,
): Promise<NextResponse> {
  const existingPayment = await prisma.gift.findFirst({
    where: { id: paymentId, wedding_id: weddingId },
  });

  if (!existingPayment) {
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Payment not found' },
    };
    return NextResponse.json(response, { status: 404 });
  }

  const validatedData = updatePaymentSchema.parse(body);

  const updateData: {
    status?: 'PENDING' | 'RECEIVED' | 'CONFIRMED';
    amount?: number;
    transaction_date?: Date;
  } = {};

  if (validatedData.status) updateData.status = validatedData.status;
  if (validatedData.amount) updateData.amount = validatedData.amount;
  if (validatedData.transaction_date) updateData.transaction_date = new Date(validatedData.transaction_date);

  const payment = await prisma.gift.update({
    where: { id: paymentId },
    data: updateData,
  });

  if (
    validatedData.status &&
    validatedData.status !== existingPayment.status &&
    (validatedData.status === 'RECEIVED' || validatedData.status === 'CONFIRMED')
  ) {
    await prisma.trackingEvent.create({
      data: {
        family_id: payment.family_id,
        wedding_id: weddingId,
        event_type: 'PAYMENT_RECEIVED',
        metadata: {
          admin_id: actorId,
          amount: Number(payment.amount),
          status_change: `${existingPayment.status} -> ${validatedData.status}`,
          new_status: validatedData.status,
          payment_id: payment.id,
        },
        admin_triggered: true,
      },
    });
  }

  const response: UpdatePaymentResponse = {
    success: true,
    data: { ...payment, amount: Number(payment.amount) },
  };

  return NextResponse.json(response, { status: 200 });
}
