import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '@/lib/pdf/invoice-pdf';
import { put, del } from '@vercel/blob';
import { resolveLogoDataUri } from '@/lib/pdf/resolve-logo';
import { getTranslations, getLanguageFromRequest } from '@/lib/i18n/server';
import React from 'react';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const force = new URL(request.url).searchParams.get('force') === 'true';

    const invoice = await prisma.invoice.findFirst({
      where: { id, planner_id: user.planner_id },
      include: { line_items: true, payments: { orderBy: { payment_date: 'desc' } }, customer: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Return cached PDF unless a regeneration is needed
    if (invoice.pdf_url && !force) {
      return NextResponse.json({ data: { pdf_url: invoice.pdf_url, invoice } });
    }

    const [planner, prevInvoice] = await Promise.all([
      prisma.weddingPlanner.findUnique({

        where: { id: user.planner_id },
        select: {
          name: true,
          email: true,
          company_email: true,
          legal_name: true,
          vat_number: true,
          address: true,
          phone: true,
          website: true,
          logo_url: true,
        },
      }),
      // Fetch previous invoice in the same series to show its chain hash in the footer
      invoice.serie && invoice.numero && invoice.numero > 1
        ? prisma.invoice.findFirst({
            where: {
              planner_id: user.planner_id,
              serie: invoice.serie,
              numero: invoice.numero - 1,
            },
            select: { chain_hash: true },
          })
        : Promise.resolve(null),
    ]);

    const locale = await getLanguageFromRequest();
    const { t } = await getTranslations(locale);
    const isProforma = (invoice as { type?: string }).type === 'PROFORMA';
    const labels = {
      docTitle: isProforma
        ? t('planner.quotesFinances.invoicePdf.proformaDocTitle')
        : t('planner.quotesFinances.invoicePdf.docTitle'),
      invoiceNumber: isProforma
        ? t('planner.quotesFinances.invoicePdf.proformaNumber')
        : t('planner.quotesFinances.invoicePdf.invoiceNumber'),
      issueDate: t('planner.quotesFinances.invoicePdf.issueDate'),
      dueDate: t('planner.quotesFinances.invoicePdf.dueDate'),
      billTo: t('planner.quotesFinances.invoicePdf.billTo'),
      from: t('planner.quotesFinances.invoicePdf.from'),
      services: t('planner.quotesFinances.invoicePdf.services'),
      description: t('planner.quotesFinances.invoicePdf.description'),
      qty: t('planner.quotesFinances.invoicePdf.qty'),
      unitPrice: t('planner.quotesFinances.invoicePdf.unitPrice'),
      total: t('planner.quotesFinances.invoicePdf.total'),
      subtotal: t('planner.quotesFinances.invoicePdf.subtotal'),
      discount: t('planner.quotesFinances.invoicePdf.discount'),
      tax: t('planner.quotesFinances.invoicePdf.tax'),
      amountPaid: t('planner.quotesFinances.invoicePdf.amountPaid'),
      balanceDue: t('planner.quotesFinances.invoicePdf.balanceDue'),
      paymentsReceived: t('planner.quotesFinances.invoicePdf.paymentsReceived'),
      date: t('planner.quotesFinances.invoicePdf.date'),
      method: t('planner.quotesFinances.invoicePdf.method'),
      reference: t('planner.quotesFinances.invoicePdf.reference'),
      amount: t('planner.quotesFinances.invoicePdf.amount'),
      notes: t('planner.quotesFinances.invoicePdf.notes'),
      footer: t('planner.quotesFinances.invoicePdf.footer'),
      idPrefix: t('planner.quotesFinances.invoicePdf.idPrefix'),
      vat: t('planner.quotesFinances.invoicePdf.vat'),
      previousHash: t('planner.quotesFinances.invoicePdf.previousHash'),
    };

    const logoDataUri = await resolveLogoDataUri(planner?.logo_url);

    const buffer = await renderToBuffer(
      React.createElement(InvoicePDF, {
        invoice,
        company: {
          name: planner?.name ?? 'Wedding Planner',
          email: planner?.company_email || planner?.email,
          logoUrl: logoDataUri,
          legalName: planner?.legal_name ?? undefined,
          vatNumber: planner?.vat_number ?? undefined,
          address: planner?.address ?? undefined,
          phone: planner?.phone ?? undefined,
          website: planner?.website ?? undefined,
        },
        labels,
        locale,
        previousHash: prevInvoice?.chain_hash ?? planner?.last_external_hash ?? null,
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
