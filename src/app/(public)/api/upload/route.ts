import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, generateUniqueFilename } from '@/lib/storage';
import { isVectorEnabled } from '@/lib/db/vector-prisma';
import { scheduleIngestion } from '@/lib/ai/ingestion';
import { getCurrentUser } from '@/lib/auth/middleware';

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
]);

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    const weddingProviderId = data.get('weddingProviderId') as string | null;
    const paymentId = data.get('paymentId') as string | null;
    const locationId = data.get('locationId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const filename = generateUniqueFilename(file.name.replace(/[^a-zA-Z0-9.-]/g, '_'));
    const filepath = `uploads/${filename}`;

    // Upload to storage (Vercel Blob or filesystem)
    const result = await uploadFile(filepath, buffer, {
      contentType: file.type,
    });

    // Schedule ingestion for document-type files when vector DB is enabled
    if (isVectorEnabled() && DOCUMENT_MIME_TYPES.has(file.type)) {
      const user = await getCurrentUser();
      const docType =
        user?.role === 'master_admin'
          ? 'SYSTEM_MANUAL'
          : user?.role === 'planner'
            ? 'WAYS_OF_WORKING'
            : 'WEDDING_DOCUMENT';

      scheduleIngestion({
        blobUrl: result.url,
        sourceName: result.pathname ?? filepath,
        fullUrl: result.url,
        docType,
        weddingId: user?.wedding_id,
        plannerId: user?.planner_id,
        weddingProviderId: weddingProviderId || undefined,
        paymentId: paymentId || undefined,
        locationId: locationId || undefined,
      });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
