import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

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

    const invoice = await prisma.invoice.findFirst({
      where: { id, planner_id: user.planner_id },
      include: { payments: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const data = createPaymentSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.invoicePayment.create({
        data: {
          invoice_id: id,
          amount: data.amount,
          currency: data.currency,
          payment_date: new Date(data.payment_date),
          method: data.method,
          reference: data.reference ?? null,
          notes: data.notes ?? null,
        },
      });

      // Recompute amount_paid and update status
      const allPayments = await tx.invoicePayment.findMany({ where: { invoice_id: id } });
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const invoiceTotal = Number(invoice.total);

      let newStatus: 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' = invoice.status;
      if (totalPaid >= invoiceTotal) {
        newStatus = 'PAID';
      } else if (totalPaid > 0) {
        newStatus = 'PARTIAL';
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          amount_paid: totalPaid,
          status: newStatus,
        },
        include: { payments: { orderBy: { payment_date: 'desc' } }, line_items: true },
      });

      return { payment, invoice: updatedInvoice };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
