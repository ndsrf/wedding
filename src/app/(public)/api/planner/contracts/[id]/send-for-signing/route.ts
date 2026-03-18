import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { renderToBuffer } from '@react-pdf/renderer';
import { ContractPDF } from '@/lib/pdf/contract-pdf';
import { createSignatureRequest } from '@/lib/signing/dropbox-sign';
import { put } from '@vercel/blob';
import React from 'react';

const sendSchema = z.object({
  signer_email: z.string().email(),
  signer_name: z.string().min(1),
  message: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (contract.status === 'SIGNED') {
      return NextResponse.json({ error: 'Contract is already signed' }, { status: 400 });
    }

    const body = await request.json();
    const data = sendSchema.parse(body);

    const planner = await prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: { name: true },
    });

    // Generate PDF from current content
    const buffer = await renderToBuffer(
      React.createElement(ContractPDF, {
        title: contract.title,
        content: contract.content as { type: string; content?: never[] },
        plannerName: planner?.name ?? 'Wedding Planner',
        signerName: data.signer_name,
        createdAt: contract.created_at,
      }) as never
    );

    const blob = await put(`contracts/${id}/signing-${Date.now()}.pdf`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    // Create Dropbox Sign signature request
    const signingResult = await createSignatureRequest({
      pdfUrl: blob.url,
      signerEmail: data.signer_email,
      signerName: data.signer_name,
      title: contract.title,
      message: data.message,
    });

    // Update contract with signing info
    const updated = await prisma.contract.update({
      where: { id },
      data: {
        status: 'SIGNING',
        signer_email: data.signer_email,
        signing_request_id: signingResult.signatureRequestId,
        signing_url: signingResult.signUrl ?? null,
      },
    });

    return NextResponse.json({
      data: {
        contract: updated,
        sign_url: signingResult.signUrl,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    console.error('Send for signing error:', error);
    return NextResponse.json({ error: 'Failed to send for signing' }, { status: 500 });
  }
}
