import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/lib/pdf/invoice-pdf';
import { put } from '@vercel/blob';
import React from 'react';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, planner_id: user.planner_id },
      include: { line_items: true, payments: { orderBy: { payment_date: 'desc' } } },
    });
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const planner = await prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: { name: true, email: true },
    });

    const buffer = await renderToBuffer(
      React.createElement(InvoicePDF, {
        invoice,
        plannerName: planner?.name ?? 'Wedding Planner',
        plannerEmail: planner?.email,
      }) as never
    );

    const blob = await put(`invoices/${id}/invoice-${Date.now()}.pdf`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    const updated = await prisma.invoice.update({
      where: { id },
      data: { pdf_url: blob.url },
    });

    return NextResponse.json({ data: { pdf_url: blob.url, invoice: updated } });
  } catch (error) {
    console.error('Invoice PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
