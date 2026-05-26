import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { recordInvoicePayment } from '@/lib/invoices/service';

const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
  payment_date: z.string().datetime(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'PAYPAL', 'BIZUM', 'REVOLUT', 'OTHER']).default('BANK_TRANSFER'),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const body = await request.json();
    const data = createPaymentSchema.parse(body);

    const result = await recordInvoicePayment(user.planner_id, id, {
      amount: data.amount,
      currency: data.currency,
      paymentDate: new Date(data.payment_date),
      method: data.method,
      reference: data.reference,
      notes: data.notes,
    });

    return NextResponse.json({ data: { payment: result.payment, invoice: result.updatedInvoice } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('not found')) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('POST /api/planner/invoices/[id]/payments error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
