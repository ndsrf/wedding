import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { renderToBuffer } from '@react-pdf/renderer';
import { QuotePDF } from '@/lib/pdf/quote-pdf';
import { put } from '@vercel/blob';
import React from 'react';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const quote = await prisma.quote.findFirst({
      where: { id, planner_id: user.planner_id },
      include: { line_items: true },
    });
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const planner = await prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: { name: true, email: true },
    });

    const buffer = await renderToBuffer(
      React.createElement(QuotePDF, {
        quote,
        plannerName: planner?.name ?? 'Wedding Planner',
        plannerEmail: planner?.email,
      }) as never
    );

    const blob = await put(`quotes/${id}/quote-${Date.now()}.pdf`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
    });

    const updated = await prisma.quote.update({
      where: { id },
      data: { pdf_url: blob.url },
    });

    return NextResponse.json({ data: { pdf_url: blob.url, quote: updated } });
  } catch (error) {
    console.error('Quote PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
