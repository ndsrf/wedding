import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { uploadFile } from '@/lib/storage';
import { renderToBuffer, Document, Page, Image as PDFImage } from '@react-pdf/renderer';
import React from 'react';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

async function convertImageToPdf(imageBuffer: Buffer, mimeType: string): Promise<Buffer> {
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  return renderToBuffer(
    React.createElement(
      Document,
      {},
      React.createElement(
        Page,
        { size: 'A4', style: { margin: 0, padding: 0 } },
        React.createElement(PDFImage, {
          src: dataUri,
          style: { width: '100%', height: '100%', objectFit: 'contain' },
        }),
      ),
    ) as never,
  );
}

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
      return NextResponse.json({ error: 'Contract is already signed' }, { status: 409 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF or image.' },
        { status: 422 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 20 MB limit.' }, { status: 422 });
    }

    const isImage = file.type.startsWith('image/');
    let contentType = file.type;

    // Convert images to PDF so the signed document is always a PDF
    if (isImage) {
      buffer = await convertImageToPdf(buffer, file.type) as Buffer;
      contentType = 'application/pdf';
    }

    const storagePath = `contracts/${id}/signed/signed-contract.pdf`;

    const { url } = await uploadFile(storagePath, buffer, {
      contentType,
      access: 'public',
      allowOverwrite: true,
    });

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signed_pdf_url: url,
        signed_at: new Date(),
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        quote: { select: { id: true, couple_names: true, currency: true, total: true } },
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
