import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import crypto from 'crypto';

function buildSerie(type: 'INVOICE' | 'RECTIFICATIVA', year: number): string {
  const yearShort = String(year).slice(2);
  return type === 'INVOICE' ? `FAC-${yearShort}` : `REC-${yearShort}`;
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
 * The proforma must be PAID and must not already have a derived invoice.
 *
 * Implements:
 * - MAX-based sequential numbering (no gaps)
 * - Date ordering validation
 * - Chain hash for Verifactu preparation
 * - Read-only locking (type=INVOICE prevents further edits)
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: proformaId } = await params;

    // Validate the proforma
    const proforma = await prisma.invoice.findFirst({
      where: { id: proformaId, planner_id: user.planner_id },
      include: {
        line_items: true,
        customer: true,
        derived_invoice: true,
      },
    });

    if (!proforma) return NextResponse.json({ error: 'Proforma not found' }, { status: 404 });
    if (proforma.type !== 'PROFORMA') {
      return NextResponse.json({ error: 'Only proforma invoices can be converted' }, { status: 400 });
    }
    if (proforma.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Proforma must be fully paid before converting to an invoice' },
        { status: 400 },
      );
    }
    if (proforma.derived_invoice) {
      return NextResponse.json(
        { error: 'This proforma already has a linked invoice', data: { invoice_id: proforma.derived_invoice.id } },
        { status: 409 },
      );
    }

    const issuedAt = new Date();

    const invoice = await prisma.$transaction(async (tx) => {
      const year = issuedAt.getFullYear();
      const serie = buildSerie('INVOICE', year);

      // MAX-based sequential numbering
      const last = await tx.invoice.findFirst({
        where: { planner_id: user.planner_id!, serie },
        orderBy: { numero: 'desc' },
        select: { numero: true, issued_at: true, chain_hash: true },
      });

      const numero = (last?.numero ?? 0) + 1;

      // Date ordering validation
      if (last?.issued_at && issuedAt < last.issued_at) {
        throw new Error('DATE_ORDER_VIOLATION');
      }

      const invoice_number = `${serie}-${String(numero).padStart(4, '0')}`;

      // Compute chain hash
      const chain_hash = computeChainHash({
        invoice_number,
        issued_at: issuedAt,
        total: Number(proforma.total),
        planner_id: user.planner_id!,
        previous_hash: last?.chain_hash ?? null,
      });

      return tx.invoice.create({
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
    if (error instanceof Error && error.message === 'DATE_ORDER_VIOLATION') {
      return NextResponse.json(
        { error: 'La fecha de emisión no puede ser anterior a la última factura de la misma serie.' },
        { status: 422 },
      );
    }
    console.error('Convert proforma to invoice error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
