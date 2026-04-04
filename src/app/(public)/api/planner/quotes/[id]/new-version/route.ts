import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.quote.findFirst({
      where: { id, planner_id: user.planner_id },
      include: { line_items: true, next_version: true },
    });

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.status !== 'REJECTED') {
      return NextResponse.json({ error: 'Only rejected quotes can have a new version created' }, { status: 422 });
    }
    if (existing.next_version) {
      return NextResponse.json({ error: 'A newer version already exists for this quote' }, { status: 422 });
    }

    const newQuote = await prisma.quote.create({
      data: {
        planner_id: existing.planner_id,
        customer_id: existing.customer_id,
        couple_names: existing.couple_names,
        event_date: existing.event_date,
        location: existing.location,
        notes: existing.notes,
        currency: existing.currency,
        subtotal: existing.subtotal,
        discount: existing.discount,
        tax_rate: existing.tax_rate,
        total: existing.total,
        expires_at: existing.expires_at,
        status: 'DRAFT',
        version: existing.version + 1,
        previous_version_id: existing.id,
        line_items: {
          create: existing.line_items.map((item) => ({
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
        contracts: { select: { id: true, status: true, share_token: true, signed_pdf_url: true } },
        invoices: { select: { id: true, status: true, total: true, amount_paid: true } },
      },
    });

    return NextResponse.json({ data: newQuote }, { status: 201 });
  } catch (error) {
    console.error('POST /api/planner/quotes/[id]/new-version error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
