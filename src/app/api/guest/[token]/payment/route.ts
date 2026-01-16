/**
 * Guest RSVP API - Payment Information
 * GET /api/guest/:token/payment
 *
 * Returns payment information including IBAN and reference code (if automated mode).
 * Shows payment status if payment has been received.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateMagicLink } from '@/lib/auth/magic-link';
import { prisma } from '@/lib/db/prisma';
import type { GetPaymentInfoResponse, PaymentInfo } from '@/types/api';

// This would typically come from environment variables or wedding configuration
const WEDDING_IBAN = process.env.WEDDING_IBAN || 'ES91 2100 0418 4502 0005 1332';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Validate magic token
    const validation = await validateMagicLink(token);

    if (!validation.valid || !validation.family || !validation.wedding) {
      return NextResponse.json<GetPaymentInfoResponse>(
        {
          success: false,
          error: {
            code: validation.error || 'INVALID_TOKEN',
            message: 'Invalid or expired link',
          },
        },
        { status: 404 }
      );
    }

    const { family, wedding } = validation;

    // Check if family has made a payment
    const payment = await prisma.gift.findFirst({
      where: {
        family_id: family.id,
        wedding_id: wedding.id,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Prepare payment information
    const paymentInfo: PaymentInfo = {
      payment_mode: wedding.payment_tracking_mode,
      iban: WEDDING_IBAN,
      reference_code:
        wedding.payment_tracking_mode === 'AUTOMATED'
          ? family.reference_code
          : null,
      payment_status: payment?.status || null,
      amount_paid: payment ? Number(payment.amount) : null,
    };

    return NextResponse.json<GetPaymentInfoResponse>({
      success: true,
      data: paymentInfo,
    });
  } catch (error) {
    console.error('Get payment info error:', error);
    return NextResponse.json<GetPaymentInfoResponse>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while loading payment information',
        },
      },
      { status: 500 }
    );
  }
}
