import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { renderToBuffer } from '@react-pdf/renderer';
import { ContractPDF } from '@/lib/pdf/contract-pdf';
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

    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // If a cached PDF URL exists, return it unless forced to regenerate
    if (contract.pdf_url && !force) {
      return NextResponse.json({ data: { pdf_url: contract.pdf_url } });
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
        signature_url: true,
      },
    });

    const locale = await getLanguageFromRequest();
    const { t } = await getTranslations(locale);
    const labels = {
      dateLabel: t('planner.quotesFinances.contractPdf.dateLabel'),
      footer: t('planner.quotesFinances.contractPdf.footer'),
      sigPageTitle: t('planner.quotesFinances.contractPdf.sigPageTitle'),
      sigPageSubtitle: t('planner.quotesFinances.contractPdf.sigPageSubtitle'),
      weddingPlanner: t('planner.quotesFinances.contractPdf.weddingPlanner'),
      clientSigner: t('planner.quotesFinances.contractPdf.clientSigner'),
      signatureDate: t('planner.quotesFinances.contractPdf.signatureDate'),
    };

    const [logoDataUri, signatureDataUri] = await Promise.all([
      resolveLogoDataUri(planner?.logo_url),
      resolveLogoDataUri(planner?.signature_url),
    ]);

    const buffer = await renderToBuffer(
      React.createElement(ContractPDF, {
        title: contract.title,
        content: contract.content as { type: string; content?: never[] },
        company: {
          name: planner?.name ?? 'Wedding Planner',
          email: planner?.email,
          logoUrl: logoDataUri,
          legalName: planner?.legal_name ?? undefined,
          vatNumber: planner?.vat_number ?? undefined,
          address: planner?.address ?? undefined,
          phone: planner?.phone ?? undefined,
          website: planner?.website ?? undefined,
          signatureUrl: signatureDataUri,
        },
        signerName: contract.signer_name ?? contract.signer_email ?? undefined,
        createdAt: contract.created_at,
        labels,
        locale,
      }) as never
    );

    // Delete the old blob first, then upload to a unique path.
    // Vercel Blob serves URLs with Cache-Control: immutable — reusing the same
    // URL after overwriting means browsers and CDN keep serving the old file.
    if (contract.pdf_url?.startsWith('http')) {
      try { await del(contract.pdf_url); } catch { /* non-fatal */ }
    }

    const blob = await put(`contracts/${id}/contract-${Date.now()}.pdf`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    await prisma.contract.update({
      where: { id },
      data: { pdf_url: blob.url },
    });

    return NextResponse.json({ data: { pdf_url: blob.url } });
  } catch (error) {
    console.error('Contract PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
