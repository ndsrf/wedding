import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const lineItemSchema = z.object({
  id: z.string().optional(), // existing items have an id
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  total: z.number().min(0),
});

const updateQuoteSchema = z.object({
  couple_names: z.string().min(1).optional(),
  event_date: z.preprocess((v) => v || null, z.string().datetime().optional().nullable()),
  location: z.string().optional().nullable(),
  client_email: z.string().email().optional().nullable().or(z.literal('')),
  client_phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  currency: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  discount: z.number().min(0).optional().nullable(),
  tax_rate: z.number().min(0).max(100).optional().nullable(),
  total: z.number().min(0).optional(),
  expires_at: z.preprocess((v) => v || null, z.string().datetime().optional().nullable()),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  line_items: z.array(lineItemSchema).optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const quote = await prisma.quote.findFirst({
      where: { id, planner_id: user.planner_id },
      include: {
        line_items: true,
        contract: { select: { id: true, status: true, share_token: true } },
        invoices: { select: { id: true, invoice_number: true, status: true, total: true, amount_paid: true } },
      },
    });
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: quote });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.quote.findFirst({ where: { id, planner_id: user.planner_id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const data = updateQuoteSchema.parse(body);

    const { line_items: lineItems, ...quoteData } = data;

    const updated = await prisma.$transaction(async (tx) => {
      if (lineItems !== undefined) {
        // Replace all line items
        await tx.quoteLineItem.deleteMany({ where: { quote_id: id } });
        await tx.quoteLineItem.createMany({
          data: lineItems.map((item) => ({
            quote_id: id,
            name: item.name,
            description: item.description ?? null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
          })),
        });
      }

      return tx.quote.update({
        where: { id },
        data: {
          ...(quoteData.couple_names !== undefined && { couple_names: quoteData.couple_names }),
          ...(quoteData.event_date !== undefined && { event_date: quoteData.event_date ? new Date(quoteData.event_date) : null }),
          ...(quoteData.location !== undefined && { location: quoteData.location }),
          ...(quoteData.client_email !== undefined && { client_email: quoteData.client_email || null }),
          ...(quoteData.client_phone !== undefined && { client_phone: quoteData.client_phone }),
          ...(quoteData.notes !== undefined && { notes: quoteData.notes }),
          ...(quoteData.currency !== undefined && { currency: quoteData.currency }),
          ...(quoteData.subtotal !== undefined && { subtotal: quoteData.subtotal }),
          ...(quoteData.discount !== undefined && { discount: quoteData.discount }),
          ...(quoteData.tax_rate !== undefined && { tax_rate: quoteData.tax_rate }),
          ...(quoteData.total !== undefined && { total: quoteData.total }),
          ...(quoteData.expires_at !== undefined && { expires_at: quoteData.expires_at ? new Date(quoteData.expires_at) : null }),
          ...(quoteData.status !== undefined && { status: quoteData.status }),
        },
        include: { line_items: true },
      });
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.quote.findFirst({ where: { id, planner_id: user.planner_id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.quote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
