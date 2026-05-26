/**
 * Invoice Service
 *
 * Pure business-logic functions for invoice operations — no HTTP coupling.
 * Consumed by both the planner REST API routes and the AI tool handlers.
 */

import { prisma } from '@/lib/db/prisma';
import type { Invoice, InvoicePayment } from '@prisma/client';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RecordInvoicePaymentInput {
  amount: number;
  currency?: string;
  paymentDate: Date;
  method?: 'CASH' | 'BANK_TRANSFER' | 'PAYPAL' | 'BIZUM' | 'REVOLUT' | 'OTHER';
  reference?: string | null;
  notes?: string | null;
}

export interface RecordInvoicePaymentResult {
  payment: InvoicePayment;
  updatedInvoice: Invoice & {
    payments: InvoicePayment[];
    line_items: { id: string; name: string; quantity: unknown; unit_price: unknown; total: unknown; description: string | null }[];
  };
  totalPaid: number;
  invoiceTotal: number;
  newStatus: Invoice['status'];
}

// ── recordInvoicePayment ───────────────────────────────────────────────────────

/**
 * Record a payment against an invoice and update its status.
 *
 * Uses an atomic INCREMENT on amount_paid (translates to
 * `UPDATE … SET amount_paid = amount_paid + ?`) so concurrent payments for
 * the same invoice cannot overwrite each other's write. The returned
 * amount_paid is then used to derive the new status in the same transaction.
 *
 * @throws Error if the invoice is not found for this planner, is cancelled,
 *   or if paymentDate is not a valid Date.
 */
export async function recordInvoicePayment(
  plannerId: string,
  invoiceId: string,
  input: RecordInvoicePaymentInput,
): Promise<RecordInvoicePaymentResult> {
  if (isNaN(input.paymentDate.getTime())) {
    throw new Error('Invalid payment date');
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, planner_id: plannerId },
  });

  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
  if (invoice.status === 'CANCELLED') throw new Error('Cannot record payment on a cancelled invoice');

  const invoiceTotal = Number(invoice.total);

  return prisma.$transaction(async (tx) => {
    const payment = await tx.invoicePayment.create({
      data: {
        invoice_id: invoiceId,
        amount: input.amount,
        currency: input.currency ?? invoice.currency,
        payment_date: input.paymentDate,
        method: input.method ?? 'BANK_TRANSFER',
        reference: input.reference ?? null,
        notes: input.notes ?? null,
      },
    });

    // Atomic increment — avoids the lost-update race between concurrent payments.
    // The returned amount_paid is the definitive new total for this transaction.
    const { amount_paid } = await tx.invoice.update({
      where: { id: invoiceId },
      data: { amount_paid: { increment: input.amount } },
      select: { amount_paid: true },
    });
    const totalPaid = Number(amount_paid);

    const newStatus: Invoice['status'] =
      totalPaid >= invoiceTotal ? 'PAID'
      : totalPaid > 0 ? 'PARTIAL'
      : invoice.status;

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
      include: {
        payments: { orderBy: { payment_date: 'desc' } },
        line_items: true,
      },
    });

    return { payment, updatedInvoice, totalPaid, invoiceTotal, newStatus };
  });
}
