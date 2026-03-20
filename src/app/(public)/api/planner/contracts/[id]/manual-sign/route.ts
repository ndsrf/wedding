import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { uploadFile, generateUniqueFilename } from '@/lib/storage';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

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
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 20 MB limit.' }, { status: 422 });
    }

    const uniqueName = generateUniqueFilename(file.name);
    const storagePath = `contracts/${id}/signed/${uniqueName}`;

    const { url } = await uploadFile(storagePath, buffer, {
      contentType: file.type,
      access: 'public',
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
