import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id, paymentId } = await params;

    const invoice = await prisma.invoice.findFirst({ where: { id, planner_id: user.planner_id } });
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const payment = await prisma.invoicePayment.findFirst({ where: { id: paymentId, invoice_id: id } });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const result = await prisma.$transaction(async (tx) => {
      await tx.invoicePayment.delete({ where: { id: paymentId } });

      const allPayments = await tx.invoicePayment.findMany({ where: { invoice_id: id } });
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const invoiceTotal = Number(invoice.total);

      let newStatus: 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' = invoice.status;
      if (totalPaid <= 0) {
        newStatus = invoice.issued_at ? 'ISSUED' : 'DRAFT';
      } else if (totalPaid < invoiceTotal) {
        newStatus = 'PARTIAL';
      }

      return tx.invoice.update({
        where: { id },
        data: { amount_paid: totalPaid, status: newStatus },
        include: { payments: { orderBy: { payment_date: 'desc' } }, line_items: true },
      });
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('DELETE /api/planner/invoices/[id]/payments/[paymentId] error:', error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
