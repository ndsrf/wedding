/**
 * Wedding Admin - Single Payment API Route
 *
 * PATCH /api/admin/payments/:id - Update payment status
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/src/lib/auth/middleware';
import type { APIResponse, UpdatePaymentResponse } from '@/src/types/api';
import { API_ERROR_CODES } from '@/src/types/api';

// Validation schema for updating payment
const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'RECEIVED', 'CONFIRMED']).optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  transaction_date: z.string().datetime().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/payments/:id
 * Update payment status or details
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    // Check authentication and require wedding_admin role
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Wedding ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const { id: paymentId } = await context.params;

    // Verify payment belongs to user's wedding
    const existingPayment = await prisma.gift.findFirst({
      where: {
        id: paymentId,
        wedding_id: user.wedding_id,
      },
    });

    if (!existingPayment) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Payment not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updatePaymentSchema.parse(body);

    // Build update data
    const updateData: {
      status?: 'PENDING' | 'RECEIVED' | 'CONFIRMED';
      amount?: number;
      transaction_date?: Date;
    } = {};

    if (validatedData.status) {
      updateData.status = validatedData.status;
    }

    if (validatedData.amount) {
      updateData.amount = validatedData.amount;
    }

    if (validatedData.transaction_date) {
      updateData.transaction_date = new Date(validatedData.transaction_date);
    }

    // Update payment
    const payment = await prisma.gift.update({
      where: { id: paymentId },
      data: updateData,
    });

    // Create tracking event if status changed to RECEIVED or CONFIRMED
    if (
      validatedData.status &&
      validatedData.status !== existingPayment.status
    ) {
      // Track all status changes
      if (validatedData.status === 'RECEIVED' || validatedData.status === 'CONFIRMED') {
        await prisma.trackingEvent.create({
          data: {
            family_id: payment.family_id,
            wedding_id: user.wedding_id,
            event_type: 'PAYMENT_RECEIVED',
            metadata: {
              admin_id: user.id,
              amount: Number(payment.amount),
              status_change: `${existingPayment.status} -> ${validatedData.status}`,
              new_status: validatedData.status,
              payment_id: payment.id,
            },
            admin_triggered: true,
          },
        });
      }
    }

    const response: UpdatePaymentResponse = {
      success: true,
      data: {
        ...payment,
        amount: Number(payment.amount),
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    // Handle authentication errors
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (errorMessage.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Wedding admin role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid request data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error updating payment:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update payment',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
