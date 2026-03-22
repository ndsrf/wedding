import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { del, put } from '@vercel/blob';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/lib/pdf/invoice-pdf';
import React from 'react';

const lineItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  total: z.number().min(0),
});

const updateSchema = z.object({
  client_name: z.string().min(1).optional(),
  client_email: z.string().email().optional().nullable().or(z.literal('')),
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
    const { line_items: lineItems, ...invoiceData } = data;

    // Clear cached PDF when content changes
    const pdfFields = [
      'client_name', 'client_email', 'description', 'currency', 'subtotal',
      'discount', 'tax_rate', 'tax_amount', 'total', 'due_date', 'issued_at'
    ];
    const contentChanged = lineItems !== undefined || pdfFields.some(field => field in invoiceData);

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
          ...(invoiceData.client_name !== undefined && { client_name: invoiceData.client_name }),
          ...(invoiceData.client_email !== undefined && { client_email: invoiceData.client_email || null }),
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
        include: { line_items: true, payments: { orderBy: { payment_date: 'desc' } }, quote: { select: { id: true, couple_names: true } } },
      });
    });

    // Regenerate PDF immediately when content changed so the client always gets fresh data
    if (contentChanged) {
      try {
        const planner = await prisma.weddingPlanner.findUnique({
          where: { id: user.planner_id },
          select: { name: true, email: true },
        });
        const buffer = await renderToBuffer(
          React.createElement(InvoicePDF, {
            invoice: updated,
            plannerName: planner?.name ?? 'Wedding Planner',
            plannerEmail: planner?.email,
          }) as never,
        );
        const blob = await put(`invoices/${id}/invoice.pdf`, buffer, {
          access: 'public',
          contentType: 'application/pdf',
          allowOverwrite: true,
        });
        const withPdf = await prisma.invoice.update({
          where: { id },
          data: { pdf_url: blob.url },
          include: { line_items: true, payments: { orderBy: { payment_date: 'desc' } }, quote: { select: { id: true, couple_names: true } } },
        });
        return NextResponse.json({ data: withPdf });
      } catch (pdfErr) {
        console.error('PDF regeneration failed after PATCH:', pdfErr);
        // Return the updated invoice without PDF — client will show Generate PDF button
      }
    }

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
