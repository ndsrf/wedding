/**
 * MCP — Wedding Invoices
 * GET /api/admin/mcp/invoices
 * Auth: Bearer API key (wedding_admin role)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKeyAuth } from '@/lib/auth/api-key';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiKeyAuth(request, 'wedding_admin');
    if (!ctx.wedding_id) {
      return NextResponse.json({ error: 'No wedding context' }, { status: 403 });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { quote: { converted_to_wedding_id: ctx.wedding_id } },
          { contract: { weddings: { some: { id: ctx.wedding_id } } } },
        ],
      },
      include: {
        line_items: { select: { name: true, quantity: true, unit_price: true } },
        payments: { select: { amount: true, payment_date: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(invoices.map((inv) => {
      const total = inv.line_items.reduce((sum, li) => sum + Number(li.quantity) * Number(li.unit_price), 0);
      const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        status: inv.status,
        total,
        paid,
        outstanding: total - paid,
        lineItemCount: inv.line_items.length,
        paymentCount: inv.payments.length,
      };
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[MCP] invoices error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
