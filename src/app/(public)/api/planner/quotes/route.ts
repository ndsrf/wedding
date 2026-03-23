import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const lineItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  total: z.number().min(0),
});

const createQuoteSchema = z.object({
  customer_id: z.string().optional().nullable(),
  couple_names: z.string().min(1),
  event_date: z.string().datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  // Client contact fields — stored on the Customer record, not on the Quote
  client_email: z.string().email().optional().nullable(),
  client_phone: z.string().optional().nullable(),
  client_id_number: z.string().optional().nullable(),
  client_address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  currency: z.string().default('EUR'),
  subtotal: z.number().min(0),
  discount: z.number().min(0).optional().nullable(),
  tax_rate: z.number().min(0).max(100).optional().nullable(),
  total: z.number().min(0),
  expires_at: z.string().datetime().optional().nullable(),
  line_items: z.array(lineItemSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const quotes = await prisma.quote.findMany({
      where: {
        planner_id: user.planner_id,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, couple_names: true, email: true, phone: true, id_number: true, address: true, notes: true } },
        line_items: true,
        contracts: { select: { id: true, status: true, share_token: true, signed_pdf_url: true } },
        invoices: { select: { id: true, status: true, total: true, amount_paid: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ data: quotes });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const data = createQuoteSchema.parse(body);

    // Resolve or create the customer record
    let customerId = data.customer_id ?? null;
    if (!customerId) {
      const newCustomer = await prisma.customer.create({
        data: {
          planner_id: user.planner_id,
          name: data.couple_names,
          couple_names: data.couple_names,
          email: data.client_email || null,
          phone: data.client_phone || null,
          id_number: data.client_id_number || null,
          address: data.client_address || null,
        },
      });
      customerId = newCustomer.id;
    } else {
      // Update existing customer with the latest couple_names and any provided contact data
      await prisma.customer.updateMany({
        where: { id: customerId, planner_id: user.planner_id },
        data: {
          couple_names: data.couple_names,
          ...(data.client_email !== undefined && { email: data.client_email || null }),
          ...(data.client_phone !== undefined && { phone: data.client_phone || null }),
          ...(data.client_id_number !== undefined && { id_number: data.client_id_number || null }),
          ...(data.client_address !== undefined && { address: data.client_address || null }),
        },
      });
    }

    const quote = await prisma.quote.create({
      data: {
        planner_id: user.planner_id,
        customer_id: customerId,
        couple_names: data.couple_names,
        event_date: data.event_date ? new Date(data.event_date) : null,
        location: data.location ?? null,
        notes: data.notes ?? null,
        currency: data.currency,
        subtotal: data.subtotal,
        discount: data.discount ?? null,
        tax_rate: data.tax_rate ?? null,
        total: data.total,
        expires_at: data.expires_at ? new Date(data.expires_at) : null,
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
      },
    });

    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
