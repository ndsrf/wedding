import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { uploadFile } from '@/lib/storage';
import { renderToBuffer, Document, Page, Image as PDFImage, Text, View, StyleSheet } from '@react-pdf/renderer';
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

const auditStyles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', fontSize: 11, color: '#1a1a1a' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  subtitle: { fontSize: 12, color: '#555', marginBottom: 32 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#888', letterSpacing: 1, marginBottom: 10 },
  row: { flexDirection: 'row', marginBottom: 6 },
  label: { width: 160, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  value: { flex: 1, fontSize: 11 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 24 },
  footer: { position: 'absolute', bottom: 40, left: 48, right: 48, fontSize: 9, color: '#aaa', textAlign: 'center' },
});

async function generateAuditPdf(params: {
  contractTitle: string;
  signedAt: Date;
  fileName: string;
  mimeType: string;
  plannerEmail: string;
}): Promise<Buffer> {
  const dateStr = params.signedAt.toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZoneName: 'short',
  });

  return renderToBuffer(
    React.createElement(
      Document,
      {},
      React.createElement(
        Page,
        { size: 'A4', style: auditStyles.page },
        React.createElement(Text, { style: auditStyles.title }, 'Manual Signature Audit Record'),
        React.createElement(Text, { style: auditStyles.subtitle }, 'This document certifies that a signed contract was manually uploaded.'),
        React.createElement(View, { style: auditStyles.divider }),

        React.createElement(
          View,
          { style: auditStyles.section },
          React.createElement(Text, { style: auditStyles.sectionTitle }, 'Contract Details'),
          React.createElement(
            View,
            { style: auditStyles.row },
            React.createElement(Text, { style: auditStyles.label }, 'Contract Title:'),
            React.createElement(Text, { style: auditStyles.value }, params.contractTitle),
          ),
        ),

        React.createElement(
          View,
          { style: auditStyles.section },
          React.createElement(Text, { style: auditStyles.sectionTitle }, 'Signature Event'),
          React.createElement(
            View,
            { style: auditStyles.row },
            React.createElement(Text, { style: auditStyles.label }, 'Method:'),
            React.createElement(Text, { style: auditStyles.value }, 'Manual upload by planner'),
          ),
          React.createElement(
            View,
            { style: auditStyles.row },
            React.createElement(Text, { style: auditStyles.label }, 'Signed At:'),
            React.createElement(Text, { style: auditStyles.value }, dateStr),
          ),
          React.createElement(
            View,
            { style: auditStyles.row },
            React.createElement(Text, { style: auditStyles.label }, 'Uploaded By:'),
            React.createElement(Text, { style: auditStyles.value }, params.plannerEmail),
          ),
          React.createElement(
            View,
            { style: auditStyles.row },
            React.createElement(Text, { style: auditStyles.label }, 'File Name:'),
            React.createElement(Text, { style: auditStyles.value }, params.fileName),
          ),
          React.createElement(
            View,
            { style: auditStyles.row },
            React.createElement(Text, { style: auditStyles.label }, 'File Type:'),
            React.createElement(Text, { style: auditStyles.value }, params.mimeType),
          ),
        ),

        React.createElement(
          Text,
          { style: auditStyles.footer },
          'This audit record was automatically generated when the signed document was uploaded.',
        ),
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
    // eslint-disable-next-line prefer-const
    let buffer: Buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 20 MB limit.' }, { status: 422 });
    }

    const isImage = file.type.startsWith('image/');
    let contentType = file.type;

    // Convert images to PDF so the signed document is always a PDF
    if (isImage) {
      buffer = await convertImageToPdf(buffer, file.type);
      contentType = 'application/pdf';
    }

    const signedAt = new Date();

    // Generate audit PDF
    const planner = await prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: { email: true },
    });

    const auditBuffer: Buffer = await generateAuditPdf({
      contractTitle: contract.title,
      signedAt,
      fileName: file.name,
      mimeType: file.type,
      plannerEmail: planner?.email ?? 'planner',
    });

    const [signedUpload, auditUpload] = await Promise.all([
      uploadFile(`contracts/${id}/signed/signed-contract.pdf`, buffer, {
        contentType,
        access: 'public',
        allowOverwrite: true,
      }),
      uploadFile(`contracts/${id}/signed/audit.pdf`, auditBuffer, {
        contentType: 'application/pdf',
        access: 'public',
        allowOverwrite: true,
      }),
    ]);

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signed_pdf_url: signedUpload.url,
        audit_url: auditUpload.url,
        signed_at: signedAt,
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
