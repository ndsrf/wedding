import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

function buildSerie(year: number): string {
  const yearShort = String(year).slice(2);
  return `PRO-${yearShort}`;
}

/**
 * Allocates the next sequential invoice number within the transaction.
 * Since we call this in a loop inside a single transaction, each call sees
 * the previous iteration's insert, so numbers are allocated gap-free.
 * Concurrent requests from other transactions are protected by the unique
 * constraint on (planner_id, serie, numero); a P2002 violation is caught
 * at the call site and surfaced as a 409.
 */
async function allocateInvoiceNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  plannerId: string,
  issuedAt: Date,
): Promise<{ serie: string; numero: number; invoice_number: string }> {
  const year = issuedAt.getFullYear();
  const serie = buildSerie(year);

  const last = await tx.invoice.findFirst({
    where: { planner_id: plannerId, serie },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });

  const numero = (last?.numero ?? 0) + 1;
  const invoice_number = `${serie}-${String(numero).padStart(4, '0')}`;
  return { serie, numero, invoice_number };
}

function computeDate(
  item: {
    reference_date: string;
    days_offset: number;
    fixed_date: Date | null;
  },
  weddingDate: Date | null,
  signingDate: Date | null,
): Date | null {
  if (item.reference_date === 'FIXED_DATE') {
    return item.fixed_date ?? null;
  }
  if (item.reference_date === 'WEDDING_DATE') {
    if (!weddingDate) return null;
    const d = new Date(weddingDate);
    d.setDate(d.getDate() + item.days_offset);
    return d;
  }
  if (item.reference_date === 'SIGNING_DATE') {
    if (!signingDate) return null;
    const d = new Date(signingDate);
    d.setDate(d.getDate() + item.days_offset);
    return d;
  }
  return null;
}

/** Round to 2 decimal places using integer arithmetic to avoid float drift. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    // Load contract with quote (including tax_rate and line items), customer, schedule items, and existing invoices
    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
      include: {
        quote: {
          select: {
            id: true,
            total: true,
            currency: true,
            customer_id: true,
            tax_rate: true,
            event_date: true,
            line_items: { select: { name: true, description: true }, orderBy: { id: 'asc' } },
          },
        },
        customer: { select: { id: true, name: true, email: true, id_number: true, address: true } },
        payment_schedule_items: { orderBy: { order: 'asc' } },
        invoices: { select: { id: true }, take: 1 },
      },
    });

    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Resolve dates: prefer the schedule-specific overrides, fall back to contract/quote fields
    const weddingDate = contract.payment_schedule_wedding_date ?? contract.quote?.event_date ?? null;
    const signingDate = contract.payment_schedule_signing_date ?? contract.signed_at ?? null;

    // Collect all validation errors as i18n keys — translated by the frontend
    const errors: string[] = [];

    if (contract.status !== 'SIGNED') {
      errors.push('contracts.scheduleErrors.contractNotSigned');
    }

    if (contract.invoices.length > 0) {
      errors.push('contracts.scheduleErrors.invoicesExist');
    }

    if (contract.payment_schedule_items.length === 0) {
      errors.push('contracts.scheduleErrors.emptySchedule');
    }

    const emptyDescriptions = contract.payment_schedule_items.filter(i => !i.description?.trim());
    if (emptyDescriptions.length > 0) {
      errors.push('contracts.scheduleErrors.emptyDescriptions');
    }

    if (!weddingDate && contract.payment_schedule_items.some(i => i.reference_date === 'WEDDING_DATE')) {
      errors.push('contracts.scheduleErrors.missingWeddingDate');
    }

    if (!signingDate && contract.payment_schedule_items.some(i => i.reference_date === 'SIGNING_DATE')) {
      errors.push('contracts.scheduleErrors.missingSigningDate');
    }

    const missingDates = contract.payment_schedule_items.filter(item =>
      computeDate(
        { reference_date: item.reference_date, days_offset: item.days_offset, fixed_date: item.fixed_date },
        weddingDate,
        signingDate,
      ) === null,
    );
    if (missingDates.length > 0) {
      errors.push('contracts.scheduleErrors.missingComputedDates');
    }

    if (!contract.quote) {
      errors.push('contracts.scheduleErrors.noQuote');
    }

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const quoteTotal = Number(contract.quote!.total);
    const quoteTaxRate = contract.quote!.tax_rate != null ? Number(contract.quote!.tax_rate) : null;
    const currency = contract.quote!.currency ?? 'EUR';
    const customerId = contract.customer?.id ?? contract.quote?.customer_id ?? null;

    // Build a summary of the quote's line items to append to each invoice description.
    // This lets the client see what services they are paying for on every proforma.
    const quoteLineItems = contract.quote!.line_items ?? [];
    const quoteConceptsText = quoteLineItems.length > 0
      ? '\n\nConceptos del presupuesto:\n' +
        quoteLineItems
          .map(li => `• ${li.name}${li.description ? `: ${li.description}` : ''}`)
          .join('\n')
      : '';

    // Compute invoice amounts (each PERCENTAGE is a % of the remaining balance)
    let remaining = quoteTotal;
    const invoiceData: Array<{
      /** Short milestone label — used as the invoice line item name. */
      lineItemName: string;
      /** Full invoice description: milestone label + quote concepts summary. */
      description: string;
      total: number;
      subtotal: number;
      tax_rate: number | null;
      tax_amount: number | null;
      issuedAt: Date;
    }> = [];

    for (const item of contract.payment_schedule_items) {
      const issuedAt = computeDate(
        { reference_date: item.reference_date, days_offset: item.days_offset, fixed_date: item.fixed_date },
        weddingDate!,
        signingDate,
      )!;

      let total: number;
      if (item.amount_type === 'FIXED') {
        total = round2(Math.min(Number(item.amount_value), remaining));
      } else {
        total = round2((remaining * Number(item.amount_value)) / 100);
      }
      remaining = round2(Math.max(0, remaining - total));

      // Back-calculate subtotal and tax from the tax-inclusive milestone total.
      // The quote total already includes tax, so each milestone share inherits the same rate.
      let subtotal: number;
      let tax_amount: number | null;
      if (quoteTaxRate && quoteTaxRate > 0) {
        subtotal = round2(total / (1 + quoteTaxRate / 100));
        tax_amount = round2(total - subtotal);
      } else {
        subtotal = total;
        tax_amount = null;
      }

      invoiceData.push({
        lineItemName: item.description,
        description: item.description + quoteConceptsText,
        total,
        subtotal,
        tax_rate: quoteTaxRate,
        tax_amount,
        issuedAt,
      });
    }

    // Create all proforma invoices sequentially within one transaction.
    // Sequential allocation means each call to allocateInvoiceNumber sees the
    // previous insert (same-transaction visibility), so numbers are gap-free.
    const created = await prisma.$transaction(async (tx) => {
      const invoices = [];
      for (const inv of invoiceData) {
        const { serie, numero, invoice_number } = await allocateInvoiceNumber(tx, user.planner_id!, inv.issuedAt);
        const dueDate = new Date(inv.issuedAt);
        dueDate.setDate(dueDate.getDate() + 30);

        const invoice = await tx.invoice.create({
          data: {
            type: 'PROFORMA',
            planner_id: user.planner_id!,
            customer_id: customerId,
            quote_id: contract.quote?.id ?? null,
            contract_id: contract.id,
            invoice_number,
            serie,
            numero,
            chain_hash: null,
            description: inv.description,
            currency,
            subtotal: inv.subtotal,
            discount: null,
            tax_rate: inv.tax_rate,
            tax_amount: inv.tax_amount,
            total: inv.total,
            issued_at: inv.issuedAt,
            due_date: dueDate,
            line_items: {
              create: [{
                name: inv.lineItemName,
                description: null,
                quantity: 1,
                unit_price: inv.subtotal,
                total: inv.subtotal,
              }],
            },
          },
        });
        invoices.push(invoice);
      }
      return invoices;
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    // Unique constraint violation means a concurrent request grabbed the same invoice number
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { errors: ['contracts.scheduleErrors.numberingConflict'] },
        { status: 409 },
      );
    }
    console.error('[create-schedule-invoices]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
