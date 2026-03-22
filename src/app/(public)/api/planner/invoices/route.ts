import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const lineItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  total: z.number().min(0),
});

const createInvoiceSchema = z.object({
  customer_id: z.string().optional().nullable(),
  quote_id: z.string().uuid().optional().nullable(),
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

async function generateInvoiceNumber(plannerEmail: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = plannerEmail.slice(0, 2).toUpperCase();
  const count = await prisma.invoice.count({
    where: { planner: { email: plannerEmail } },
  });
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const invoices = await prisma.invoice.findMany({
      where: {
        planner_id: user.planner_id,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        line_items: true,
        payments: { orderBy: { payment_date: 'desc' } },
        quote: { select: { id: true, couple_names: true, contracts: { select: { id: true, title: true }, take: 1 } } },
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

    const planner = await prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: { email: true },
    });
    if (!planner) return NextResponse.json({ error: 'Planner not found' }, { status: 404 });

    const invoiceNumber = await generateInvoiceNumber(planner.email);

    const invoice = await prisma.invoice.create({
      data: {
        planner_id: user.planner_id,
        customer_id: data.customer_id ?? null,
        quote_id: data.quote_id ?? null,
        invoice_number: invoiceNumber,
        client_name: data.client_name,
        client_email: data.client_email || null,
        client_id_number: data.client_id_number ?? null,
        client_address: data.client_address ?? null,
        description: data.description ?? null,
        currency: data.currency,
        subtotal: data.subtotal,
        discount: data.discount ?? null,
        tax_rate: data.tax_rate ?? null,
        tax_amount: data.tax_amount ?? null,
        total: data.total,
        due_date: data.due_date ? new Date(data.due_date) : null,
        issued_at: data.issued_at ? new Date(data.issued_at) : null,
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
        customer: { select: { id: true, name: true, email: true, phone: true } },
        line_items: true,
        payments: true,
      },
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
