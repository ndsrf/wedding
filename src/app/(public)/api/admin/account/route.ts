/**
 * Wedding Admin - Account API Route
 *
 * GET /api/admin/account - Returns wedding documents (contract, quote, invoices)
 * and pending payment schedule items from the contract
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { resolvePaymentScheduleDate } from '@/lib/wedding-utils';

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json({ error: 'No wedding assigned' }, { status: 403 });
    }

    // Fetch wedding with its linked contract (and the contract's related data)
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: {
        id: true,
        wedding_date: true,
        contract_id: true,
        contract: {
          select: {
            id: true,
            title: true,
            status: true,
            pdf_url: true,
            signed_pdf_url: true,
            signed_at: true,
            payment_schedule_signing_date: true,
            payment_schedule_wedding_date: true,
            quote: {
              select: {
                id: true,
                status: true,
                total: true,
                currency: true,
                created_at: true,
              },
            },
            invoices: {
              select: {
                id: true,
                invoice_number: true,
                type: true,
                status: true,
                total: true,
                amount_paid: true,
                pdf_url: true,
                issued_at: true,
                due_date: true,
              },
              orderBy: { issued_at: 'desc' },
            },
            payment_schedule_items: {
              select: {
                id: true,
                order: true,
                description: true,
                amount_type: true,
                amount_value: true,
                reference_date: true,
                days_offset: true,
                fixed_date: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
    }

    const contract = wedding.contract;

    const paymentSchedule = contract?.payment_schedule_items.map((item) => ({
      ...item,
      amount_value: Number(item.amount_value),
      due_date: resolvePaymentScheduleDate(
        item,
        wedding.wedding_date,
        contract.payment_schedule_wedding_date,
        contract.payment_schedule_signing_date,
      ),
    })) ?? [];

    const invoices = contract?.invoices.map((inv) => ({
      ...inv,
      total: Number(inv.total),
      amount_paid: Number(inv.amount_paid),
    })) ?? [];

    const quote = contract?.quote
      ? { ...contract.quote, total: Number(contract.quote.total) }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        contract: contract
          ? {
              id: contract.id,
              title: contract.title,
              status: contract.status,
              pdf_url: contract.pdf_url,
              signed_pdf_url: contract.signed_pdf_url,
              signed_at: contract.signed_at,
            }
          : null,
        quote,
        invoices,
        payment_schedule: paymentSchedule,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('UNAUTHORIZED')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (message.startsWith('FORBIDDEN')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    console.error('Error fetching admin account data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
