import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import crypto from 'crypto';

const lineItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  total: z.number().min(0),
});

const createInvoiceSchema = z.object({
  type: z.enum(['PROFORMA', 'INVOICE', 'RECTIFICATIVA']).default('PROFORMA'),
  customer_id: z.string().optional().nullable(),
  quote_id: z.string().uuid().optional().nullable(),
  contract_id: z.string().uuid().optional().nullable(),
  // Client contact fields — stored on the Customer record, not on the Invoice
  client_name: z.string().min(1),
  client_email: z.string().email().optional().nullable(),
  client_id_number: z.string().optional().nullable(),
  client_address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  currency: z.string().default('EUR'),
  subtotal: z.number().min(0),
  discount: z.number().min(0).optional().nullable(),
  tax_rate: z.number().min(0).max(100).optional().nullable(),
  tax_amount: z.number().min(0).optional().nullable(),
  total: z.number().min(0),
  due_date: z.string().datetime().optional().nullable(),
  issued_at: z.string().datetime().optional().nullable(),
  line_items: z.array(lineItemSchema).min(1),
});

/**
 * Builds the series prefix for a given invoice type and year.
 * Proforma: PRO-YYYY
 * Invoice (Ordinaria): FAC-YYYY
 * Rectificativa: REC-YYYY
 */
function buildSerie(type: 'PROFORMA' | 'INVOICE' | 'RECTIFICATIVA', year: number): string {
  const yearShort = String(year).slice(2); // "26" for 2026
  switch (type) {
    case 'PROFORMA': return `PRO-${yearShort}`;
    case 'INVOICE': return `FAC-${yearShort}`;
    case 'RECTIFICATIVA': return `REC-${yearShort}`;
  }
}

/**
 * Returns (serie, numero, invoice_number) using MAX(numero)+1 in a transaction-safe way.
 * For INVOICE type, also enforces date ordering (no invoice before the last one in the series).
 */
async function allocateInvoiceNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  plannerId: string,
  type: 'PROFORMA' | 'INVOICE' | 'RECTIFICATIVA',
  issuedAt?: Date,
): Promise<{ serie: string; numero: number; invoice_number: string }> {
  const year = (issuedAt ?? new Date()).getFullYear();
  const serie = buildSerie(type, year);

  // Find the maximum number in this series (SELECT FOR UPDATE equivalent via Prisma transaction)
  const last = await tx.invoice.findFirst({
    where: { planner_id: plannerId, serie },
    orderBy: { numero: 'desc' },
    select: { numero: true, issued_at: true },
  });

  const numero = (last?.numero ?? 0) + 1;

  // Date ordering validation for legal invoices only (not proformas)
  if (type === 'INVOICE' || type === 'RECTIFICATIVA') {
    if (last?.issued_at && issuedAt && issuedAt < last.issued_at) {
      throw new Error(`DATE_ORDER_VIOLATION: Cannot create a ${type} with a date (${issuedAt.toISOString()}) before the last issued invoice in series ${serie} (${last.issued_at.toISOString()})`);
    }
  }

  const invoice_number = `${serie}-${String(numero).padStart(4, '0')}`;
  return { serie, numero, invoice_number };
}

/**
 * Computes a SHA-256 chain hash over the key invoice fields.
 * Intended as a building block for Verifactu compliance.
 */
function computeChainHash(data: {
  invoice_number: string;
  issued_at: Date | null;
  total: number;
  planner_id: string;
  previous_hash: string | null;
}): string {
  const payload = [
    data.invoice_number,
    data.issued_at?.toISOString() ?? '',
    data.total.toFixed(2),
    data.planner_id,
    data.previous_hash ?? '',
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const invoices = await prisma.invoice.findMany({
      where: {
        planner_id: user.planner_id,
        ...(status ? { status: status as never } : {}),
        ...(type ? { type: type as never } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, couple_names: true, email: true, phone: true, id_number: true, address: true, notes: true } },
        line_items: true,
        payments: { orderBy: { payment_date: 'desc' } },
        quote: { select: { id: true, couple_names: true, contracts: { select: { id: true, title: true }, take: 1 } } },
        contract: { select: { id: true, title: true, status: true } },
        derived_invoice: { select: { id: true, invoice_number: true, status: true } },
        proforma: { select: { id: true, invoice_number: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ data: invoices });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const data = createInvoiceSchema.parse(body);

    const issuedAt = data.issued_at ? new Date(data.issued_at) : new Date();

    const invoice = await prisma.$transaction(async (tx) => {
      // Resolve or create the customer record
      let customerId = data.customer_id ?? null;
      if (!customerId) {
        const newCustomer = await tx.customer.create({
          data: {
            planner_id: user.planner_id!,
            name: data.client_name,
            email: data.client_email || null,
            id_number: data.client_id_number || null,
            address: data.client_address || null,
          },
        });
        customerId = newCustomer.id;
      } else {
        await tx.customer.update({
          where: { id: customerId, planner_id: user.planner_id! },
          data: {
            ...(data.client_name && { name: data.client_name }),
            ...(data.client_email !== undefined && { email: data.client_email || null }),
            ...(data.client_id_number !== undefined && { id_number: data.client_id_number || null }),
            ...(data.client_address !== undefined && { address: data.client_address || null }),
          },
        });
      }

      // Allocate sequential number (validates date order for legal invoices)
      const { serie, numero, invoice_number } = await allocateInvoiceNumber(
        tx,
        user.planner_id!,
        data.type,
        issuedAt,
      );

      // Compute chain hash (Verifactu preparation)
      const lastInSerie = await tx.invoice.findFirst({
        where: { planner_id: user.planner_id!, serie },
        orderBy: { numero: 'desc' },
        select: { chain_hash: true },
      });
      const chain_hash = (data.type === 'INVOICE' || data.type === 'RECTIFICATIVA')
        ? computeChainHash({
            invoice_number,
            issued_at: issuedAt,
            total: data.total,
            planner_id: user.planner_id!,
            previous_hash: lastInSerie?.chain_hash ?? null,
          })
        : null;

      return tx.invoice.create({
        data: {
          type: data.type,
          planner_id: user.planner_id!,
          customer_id: customerId,
          quote_id: data.quote_id ?? null,
          contract_id: data.contract_id ?? null,
          invoice_number,
          serie,
          numero,
          chain_hash,
          description: data.description ?? null,
          currency: data.currency,
          subtotal: data.subtotal,
          discount: data.discount ?? null,
          tax_rate: data.tax_rate ?? null,
          tax_amount: data.tax_amount ?? null,
          total: data.total,
          due_date: data.due_date ? new Date(data.due_date) : null,
          issued_at: issuedAt,
          line_items: {
            create: data.line_items.map((item) => ({
              name: item.name,
              description: item.description ?? null,
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
          derived_invoice: { select: { id: true, invoice_number: true, status: true } },
          proforma: { select: { id: true, invoice_number: true } },
        },
      });
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    if (error instanceof Error && error.message.startsWith('DATE_ORDER_VIOLATION')) {
      return NextResponse.json(
        { error: 'La fecha de emisión no puede ser anterior a la última factura de la misma serie.' },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
