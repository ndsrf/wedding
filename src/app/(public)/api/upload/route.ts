import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, generateUniqueFilename } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

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

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
