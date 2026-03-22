import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { renderToBuffer } from '@react-pdf/renderer';
import { ContractPDF } from '@/lib/pdf/contract-pdf';
import { createDocuSealSubmission } from '@/lib/signing/docuseal';
import { toAbsoluteUrl } from '@/lib/images/processor';
import React from 'react';

/** Count pages in a PDF buffer by scanning for /Type /Page entries (no external deps). */
function countPdfPages(buffer: Buffer): number {
  const str = buffer.toString('latin1');
  const matches = str.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 2;
}

const sendSchema = z.object({
  signer_email: z.string().email(),
  signer_name: z.string().min(1),
  message: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireRole('planner');
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // 1. Load contract from DB
  let contract;
  try {
    contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
    });
  } catch (error) {
    console.error('send-for-signing: DB lookup error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (contract.status === 'SIGNED') {
    return NextResponse.json({ error: 'Contract is already signed' }, { status: 400 });
  }

  // 2. Parse and validate request body
  let data: z.infer<typeof sendSchema>;
  try {
    const body = await request.json();
    data = sendSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // 3. Fetch company info for PDF
  let planner;
  try {
    planner = await prisma.weddingPlanner.findUnique({
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
  } catch (error) {
    console.error('send-for-signing: planner lookup error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // 4. Generate PDF — content on page(s) 0..n-2, dedicated signature page always last
  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      React.createElement(ContractPDF, {
        title: contract.title,
        content: contract.content as { type: string; content?: never[] },
        company: {
          name: planner?.name ?? 'Wedding Planner',
          email: planner?.email,
          logoUrl: toAbsoluteUrl(planner?.logo_url),
          legalName: planner?.legal_name ?? undefined,
          vatNumber: planner?.vat_number ?? undefined,
          address: planner?.address ?? undefined,
          phone: planner?.phone ?? undefined,
          website: planner?.website ?? undefined,
          signatureUrl: toAbsoluteUrl(planner?.signature_url),
        },
        signerName: data.signer_name,
        createdAt: contract.created_at,
      }) as never
    );
  } catch (error) {
    console.error('send-for-signing: PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate contract PDF' }, { status: 500 });
  }

  // 5. Count pages so DocuSeal knows which page is the signature page
  const totalPages = countPdfPages(buffer);
  const signaturePage = totalPages - 1; // 0-indexed

  // 6. Create DocuSeal template + submission (buffer sent as base64 — no Blob upload needed)
  let signingResult;
  try {
    signingResult = await createDocuSealSubmission({
      pdfBuffer: buffer,
      title: contract.title,
      signerEmail: data.signer_email,
      signerName: data.signer_name,
      signaturePage,
    });
  } catch (error) {
    console.error('send-for-signing: DocuSeal API error:', error);
    return NextResponse.json(
      { error: 'Failed to create DocuSeal signature request. Check DOCUSEAL_API_KEY.' },
      { status: 502 }
    );
  }

  // 7. Persist signing details to DB
  let updated;
  try {
    updated = await prisma.contract.update({
      where: { id },
      data: {
        status: 'SIGNING',
        signer_email: data.signer_email,
        signer_name: data.signer_name,
        // signing_request_id stores the DocuSeal submission ID (for webhook matching)
        signing_request_id: String(signingResult.submissionId),
        // signing_url stores the DocuSeal embed_src (for iframe embedding on client page)
        signing_url: signingResult.embedSrc,
      },
    });
  } catch (error) {
    console.error('send-for-signing: DB update error:', error);
    return NextResponse.json({ error: 'Failed to save signing details' }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      contract: updated,
      embed_src: signingResult.embedSrc,
      slug: signingResult.slug,
    },
  });
}
