/**
 * Wedding Admin - Payments API Route
 *
 * GET /api/admin/payments - List all payments for wedding
 * POST /api/admin/payments - Manually record a payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/src/lib/auth/middleware';
import type {
  APIResponse,
  ListPaymentsResponse,
  RecordPaymentResponse,
} from '@/src/types/api';
import { API_ERROR_CODES } from '@/src/types/api';
import type { Prisma } from '@prisma/client';

// Validation schema for query parameters
const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: z.enum(['PENDING', 'RECEIVED', 'CONFIRMED']).optional(),
  family_id: z.string().uuid().optional(),
});

// Validation schema for recording a payment
const recordPaymentSchema = z.object({
  family_id: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  transaction_date: z.string().datetime(),
  reference_code_used: z.string().optional(),
});

/**
 * GET /api/admin/payments
 * List all payments for wedding with optional filters
 */
export async function GET(request: NextRequest) {
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = listPaymentsQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      status: searchParams.get('status') || undefined,
      family_id: searchParams.get('family_id') || undefined,
    });

    const { page, limit, status, family_id } = queryParams;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.GiftWhereInput = {
      wedding_id: user.wedding_id,
    };

    if (status) {
      whereClause.status = status;
    }

    if (family_id) {
      whereClause.family_id = family_id;
    }

    // Get total count for pagination
    const total = await prisma.gift.count({ where: whereClause });

    // Fetch payments with family info
    const payments = await prisma.gift.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { transaction_date: 'desc' },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Transform to include proper decimal conversion
    const paymentsWithFamily = payments.map((payment) => ({
      id: payment.id,
      family_id: payment.family_id,
      wedding_id: payment.wedding_id,
      amount: Number(payment.amount),
      reference_code_used: payment.reference_code_used,
      auto_matched: payment.auto_matched,
      status: payment.status,
      transaction_date: payment.transaction_date,
      created_at: payment.created_at,
      family: payment.family,
    }));

    const response: ListPaymentsResponse = {
      success: true,
      data: {
        items: paymentsWithFamily,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
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
          message: 'Invalid query parameters',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error fetching payments:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch payments',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/admin/payments
 * Manually record a payment
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = recordPaymentSchema.parse(body);

    // Verify family belongs to wedding
    const family = await prisma.family.findFirst({
      where: {
        id: validatedData.family_id,
        wedding_id: user.wedding_id,
      },
    });

    if (!family) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Family not found in this wedding',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Validate transaction date is reasonable (not in future, not too far in past)
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

    // Create payment record
    const payment = await prisma.gift.create({
      data: {
        family_id: validatedData.family_id,
        wedding_id: user.wedding_id,
        amount: validatedData.amount,
        reference_code_used: validatedData.reference_code_used,
        auto_matched: false, // Manual entry
        status: 'PENDING',
        transaction_date: transactionDate,
      },
    });

    // Create tracking event for payment recorded
    await prisma.trackingEvent.create({
      data: {
        family_id: validatedData.family_id,
        wedding_id: user.wedding_id,
        event_type: 'PAYMENT_RECEIVED',
        metadata: {
          admin_id: user.id,
          amount: validatedData.amount,
          manual_entry: true,
        },
        admin_triggered: true,
      },
    });

    const response: RecordPaymentResponse = {
      success: true,
      data: {
        ...payment,
        amount: Number(payment.amount),
      },
    };

    return NextResponse.json(response, { status: 201 });
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
    console.error('Error recording payment:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to record payment',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
