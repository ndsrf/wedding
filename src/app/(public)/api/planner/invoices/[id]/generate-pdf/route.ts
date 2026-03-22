import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/lib/pdf/invoice-pdf';
import { put, del } from '@vercel/blob';
import { toAbsoluteUrl } from '@/lib/images/processor';
import React from 'react';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const force = new URL(request.url).searchParams.get('force') === 'true';

    const invoice = await prisma.invoice.findFirst({
      where: { id, planner_id: user.planner_id },
      include: { line_items: true, payments: { orderBy: { payment_date: 'desc' } } },
    });
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Return cached PDF unless a regeneration is needed
    if (invoice.pdf_url && !force) {
      return NextResponse.json({ data: { pdf_url: invoice.pdf_url, invoice } });
    }

    const planner = await prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: {
        name: true,
        email: true,
        legal_name: true,
        vat_number: true,
        address: true,
        phone: true,
        website: true,
        logo_url: true,
      },
    });

    const buffer = await renderToBuffer(
      React.createElement(InvoicePDF, {
        invoice,
        company: {
          name: planner?.name ?? 'Wedding Planner',
          email: planner?.email,
          logoUrl: toAbsoluteUrl(planner?.logo_url),
          legalName: planner?.legal_name ?? undefined,
          vatNumber: planner?.vat_number ?? undefined,
          address: planner?.address ?? undefined,
          phone: planner?.phone ?? undefined,
          website: planner?.website ?? undefined,
        },
      }) as never
    );

    // Delete the old blob first so we always upload to a fresh URL.
    // Vercel Blob serves URLs with Cache-Control: immutable — reusing the same
    // URL after overwriting means browsers and CDN keep serving the old file.
    if (invoice.pdf_url?.startsWith('http')) {
      try { await del(invoice.pdf_url); } catch { /* non-fatal */ }
    }

    // Unique path per generation guarantees a new URL each time
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
