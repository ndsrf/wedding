import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { del } from '@vercel/blob';

const lineItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  total: z.number().min(0),
});

const updateSchema = z.object({
  // Client contact fields — applied to the linked Customer record, not stored on Invoice
  client_name: z.string().min(1).optional(),
  client_email: z.string().email().optional().nullable().or(z.literal('')),
  client_id_number: z.string().optional().nullable(),
  client_address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  currency: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  discount: z.number().min(0).optional().nullable(),
  tax_rate: z.number().min(0).max(100).optional().nullable(),
  tax_amount: z.number().min(0).optional().nullable(),
  total: z.number().min(0).optional(),
  due_date: z.string().datetime().optional().nullable(),
  issued_at: z.string().datetime().optional().nullable(),
  status: z.enum(['DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  line_items: z.array(lineItemSchema).optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, planner_id: user.planner_id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, id_number: true, address: true, notes: true } },
        line_items: true,
        payments: { orderBy: { payment_date: 'desc' } },
        quote: { select: { id: true, couple_names: true } },
      },
    });
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: invoice });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.invoice.findFirst({ where: { id, planner_id: user.planner_id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const data = updateSchema.parse(body);
    const { line_items: lineItems, client_name, client_email, client_id_number, client_address, ...invoiceData } = data;

    // If client contact fields are provided, update the linked customer
    const hasClientUpdate = client_name !== undefined || client_email !== undefined
      || client_id_number !== undefined || client_address !== undefined;

    if (hasClientUpdate && existing.customer_id) {
      await prisma.customer.updateMany({
        where: { id: existing.customer_id, planner_id: user.planner_id },
        data: {
          ...(client_name !== undefined && { name: client_name }),
          ...(client_email !== undefined && { email: client_email || null }),
          ...(client_id_number !== undefined && { id_number: client_id_number || null }),
          ...(client_address !== undefined && { address: client_address || null }),
        },
      });
    }

    // Clear cached PDF when content changes
    const pdfFields = [
      'description', 'currency', 'subtotal',
      'discount', 'tax_rate', 'tax_amount', 'total', 'due_date', 'issued_at'
    ];
    const contentChanged = lineItems !== undefined || hasClientUpdate || pdfFields.some(field => field in invoiceData);

    const updated = await prisma.$transaction(async (tx) => {
      if (lineItems !== undefined) {
        await tx.invoiceLineItem.deleteMany({ where: { invoice_id: id } });
        await tx.invoiceLineItem.createMany({
          data: lineItems.map((item) => ({
            invoice_id: id,
            name: item.name,
            description: item.description ?? null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
          })),
        });
      }

      return tx.invoice.update({
        where: { id },
        data: {
          ...(invoiceData.description !== undefined && { description: invoiceData.description }),
          ...(invoiceData.currency !== undefined && { currency: invoiceData.currency }),
          ...(invoiceData.subtotal !== undefined && { subtotal: invoiceData.subtotal }),
          ...(invoiceData.discount !== undefined && { discount: invoiceData.discount }),
          ...(invoiceData.tax_rate !== undefined && { tax_rate: invoiceData.tax_rate }),
          ...(invoiceData.tax_amount !== undefined && { tax_amount: invoiceData.tax_amount }),
          ...(invoiceData.total !== undefined && { total: invoiceData.total }),
          ...(invoiceData.due_date !== undefined && { due_date: invoiceData.due_date ? new Date(invoiceData.due_date) : null }),
          ...(invoiceData.issued_at !== undefined && { issued_at: invoiceData.issued_at ? new Date(invoiceData.issued_at) : null }),
          ...(invoiceData.status !== undefined && { status: invoiceData.status }),
          ...(contentChanged && { pdf_url: null }),
        },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true, id_number: true, address: true, notes: true } },
          line_items: true,
          payments: { orderBy: { payment_date: 'desc' } },
          quote: { select: { id: true, couple_names: true } },
        },
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

    const existing = await prisma.invoice.findFirst({ where: { id, planner_id: user.planner_id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Delete the PDF blob if it exists
    if (existing.pdf_url) {
      try {
        await del(existing.pdf_url);
      } catch (e) {
        console.warn('Failed to delete invoice PDF blob:', e);
      }
    }

    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
