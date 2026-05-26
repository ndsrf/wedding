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
 * Re-fetches all existing payments inside the transaction to compute an accurate
 * running total (avoids race conditions from concurrent writes).
 *
 * @throws Error if the invoice is not found for this planner, or is cancelled.
 */
export async function recordInvoicePayment(
  plannerId: string,
  invoiceId: string,
  input: RecordInvoicePaymentInput,
): Promise<RecordInvoicePaymentResult> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, planner_id: plannerId },
  });

  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
  if (invoice.status === 'CANCELLED') throw new Error('Cannot record payment on a cancelled invoice');

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

    // Re-query all payments for an accurate total
    const allPayments = await tx.invoicePayment.findMany({ where: { invoice_id: invoiceId } });
    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const invoiceTotal = Number(invoice.total);

    let newStatus: Invoice['status'] = invoice.status;
    if (totalPaid >= invoiceTotal) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIAL';
    }

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { amount_paid: totalPaid, status: newStatus },
      include: {
        payments: { orderBy: { payment_date: 'desc' } },
        line_items: true,
      },
    });

    return { payment, updatedInvoice, totalPaid, invoiceTotal, newStatus };
  });
}
