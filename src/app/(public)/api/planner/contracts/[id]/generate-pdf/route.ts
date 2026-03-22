import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { renderToBuffer } from '@react-pdf/renderer';
import { ContractPDF } from '@/lib/pdf/contract-pdf';
import { put } from '@vercel/blob';
import React from 'react';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // If a cached PDF URL exists, return it
    if (contract.pdf_url) {
      return NextResponse.json({ data: { pdf_url: contract.pdf_url } });
    }

    const planner = await prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: { name: true },
    });

    const buffer = await renderToBuffer(
      React.createElement(ContractPDF, {
        title: contract.title,
        content: contract.content as { type: string; content?: never[] },
        plannerName: planner?.name ?? 'Wedding Planner',
        signerName: contract.signer_email ?? undefined,
        createdAt: contract.created_at,
      }) as never
    );

    // Use stable filename so re-generation overwrites the same file
    const blob = await put(`contracts/${id}/contract.pdf`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
      allowOverwrite: true,
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
