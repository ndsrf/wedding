import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import crypto from 'crypto';

function buildSerie(year: number): string {
  return `FAC-${String(year).slice(2)}`;
}

function computeChainHash(data: {
  invoice_number: string;
  issued_at: Date;
  total: number;
  planner_id: string;
  previous_hash: string | null;
}): string {
  const payload = [
    data.invoice_number,
    data.issued_at.toISOString(),
    data.total.toFixed(2),
    data.planner_id,
    data.previous_hash ?? '',
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * POST /api/planner/invoices/[id]/convert-to-invoice
 *
 * Converts a fully-paid PROFORMA into a definitive INVOICE (Factura Ordinaria).
 *
 * All validation (including the derived_invoice conflict check) runs inside the
 * $transaction block so that concurrent requests cannot produce duplicate invoices.
 * The proforma_id @unique constraint in the DB provides an additional safety net
 * against race conditions.
 *
 * Payment records are moved from the proforma to the new invoice within the same
 * transaction so the definitive invoice carries the full audit trail.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: proformaId } = await params;

    const issuedAt = new Date();

    const invoice = await prisma.$transaction(async (tx) => {
      // --- Validation inside the transaction to prevent race conditions ---
      const proforma = await tx.invoice.findFirst({
        where: { id: proformaId, planner_id: user.planner_id! },
        include: {
          line_items: true,
          payments: true,
          derived_invoice: { select: { id: true } },
        },
      });

      if (!proforma) throw new Error('NOT_FOUND');
      if (proforma.type !== 'PROFORMA') throw new Error('NOT_PROFORMA');
      if (proforma.status !== 'PAID') throw new Error('NOT_PAID');
      if (proforma.derived_invoice) throw new Error('ALREADY_CONVERTED');

      // --- Allocate sequential number ---
      const year = issuedAt.getFullYear();
      const serie = buildSerie(year);

      const last = await tx.invoice.findFirst({
        where: { planner_id: user.planner_id!, serie },
        orderBy: { numero: 'desc' },
        select: { numero: true, issued_at: true, chain_hash: true },
      });

      const numero = (last?.numero ?? 0) + 1;

      if (last?.issued_at && issuedAt < last.issued_at) {
        throw new Error('DATE_ORDER_VIOLATION');
      }

      const invoice_number = `${serie}-${String(numero).padStart(4, '0')}`;

      const chain_hash = computeChainHash({
        invoice_number,
        issued_at: issuedAt,
        total: Number(proforma.total),
        planner_id: user.planner_id!,
        previous_hash: last?.chain_hash ?? null,
      });

      // --- Create the definitive invoice ---
      const newInvoice = await tx.invoice.create({
        data: {
          type: 'INVOICE',
          planner_id: user.planner_id!,
          customer_id: proforma.customer_id,
          quote_id: proforma.quote_id,
          contract_id: proforma.contract_id,
          proforma_id: proformaId,
          invoice_number,
          serie,
          numero,
          chain_hash,
          description: proforma.description,
          currency: proforma.currency,
          subtotal: proforma.subtotal,
          discount: proforma.discount,
          tax_rate: proforma.tax_rate,
          tax_amount: proforma.tax_amount,
          total: proforma.total,
          amount_paid: proforma.amount_paid,
          status: 'PAID',
          issued_at: issuedAt,
          due_date: proforma.due_date,
          line_items: {
            create: proforma.line_items.map((item) => ({
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.total,
            })),
          },
        },
      });

      // --- Move payment records from the proforma to the definitive invoice ---
      // The definitive invoice is the legal document; it must carry the full audit trail.
      if (proforma.payments.length > 0) {
        await tx.invoicePayment.updateMany({
          where: { invoice_id: proformaId },
          data: { invoice_id: newInvoice.id },
        });
        // Reset amount_paid on the proforma so it no longer counts toward revenue stats.
        await tx.invoice.update({
          where: { id: proformaId },
          data: { amount_paid: 0 },
        });
      }

      return tx.invoice.findUniqueOrThrow({
        where: { id: newInvoice.id },
        include: {
          customer: { select: { id: true, name: true, couple_names: true, email: true, phone: true, id_number: true, address: true, notes: true } },
          line_items: true,
          payments: true,
          contract: { select: { id: true, title: true, status: true } },
          proforma: { select: { id: true, invoice_number: true } },
        },
      });
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Proforma not found' }, { status: 404 });
      if (error.message === 'NOT_PROFORMA') return NextResponse.json({ error: 'Only proforma invoices can be converted' }, { status: 400 });
      if (error.message === 'NOT_PAID') return NextResponse.json({ error: 'Proforma must be fully paid before converting to an invoice' }, { status: 400 });
      if (error.message === 'ALREADY_CONVERTED') return NextResponse.json({ error: 'This proforma already has a linked invoice' }, { status: 409 });
      if (error.message === 'DATE_ORDER_VIOLATION') return NextResponse.json({ error: 'La fecha de emisión no puede ser anterior a la última factura de la misma serie.' }, { status: 422 });
    }
    console.error('Convert proforma to invoice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
