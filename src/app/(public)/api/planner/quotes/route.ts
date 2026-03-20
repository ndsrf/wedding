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
  couple_names: z.string().min(1),
  event_date: z.preprocess((v) => v || null, z.string().datetime().optional().nullable()),
  location: z.string().optional().nullable(),
  client_email: z.string().email().optional().nullable().or(z.literal('')),
  client_phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  currency: z.string().default('EUR'),
  subtotal: z.number().min(0),
  discount: z.preprocess((v) => (v === '' ? null : v), z.number().min(0).optional().nullable()),
  tax_rate: z.preprocess((v) => (v === '' ? null : v), z.number().min(0).max(100).optional().nullable()),
  total: z.number().min(0),
  expires_at: z.preprocess((v) => v || null, z.string().datetime().optional().nullable()),
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
        line_items: true,
        contract: { select: { id: true, status: true } },
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
    console.log('[quotes POST] body:', JSON.stringify(body));
    const parseResult = createQuoteSchema.safeParse(body);
    if (!parseResult.success) {
      console.log('[quotes POST] validation failed:', JSON.stringify(parseResult.error.issues));
      return NextResponse.json({ error: parseResult.error.issues }, { status: 422 });
    }
    const data = parseResult.data;

    const quote = await prisma.quote.create({
      data: {
        planner_id: user.planner_id,
        couple_names: data.couple_names,
        event_date: data.event_date ? new Date(data.event_date) : null,
        location: data.location ?? null,
        client_email: data.client_email || null,
        client_phone: data.client_phone ?? null,
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
      include: { line_items: true },
    });

    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
