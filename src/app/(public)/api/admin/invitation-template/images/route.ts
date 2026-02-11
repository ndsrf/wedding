/**
 * Invitation Template Images API
 *
 * GET: List uploaded images for wedding
 * POST: Upload new image
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { requireRole } from '@/lib/auth/middleware';
import { processTemplateImage, isValidImageType } from '@/lib/images/processor';
import { uploadFile, isUsingBlobStorage } from '@/lib/storage';
import { list } from '@vercel/blob';
import type { ImageFile } from '@/types/invitation-template';

// ============================================================================
// GET - List uploaded images
// ============================================================================

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID not found in user context' },
        { status: 400 }
      );
    }

    let images: ImageFile[] = [];

    if (isUsingBlobStorage()) {
      // List files from Vercel Blob Storage
      const prefix = `uploads/invitation-images/${user.wedding_id}/`;
      const { blobs } = await list({ prefix });

      images = blobs.map((blob) => ({
        url: blob.url,
        filename: blob.pathname.split('/').pop() || '',
      }));
    } else {
      // List files from local filesystem
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invitation-images', user.wedding_id);

      let files: string[] = [];
      try {
        files = await fs.readdir(uploadDir);
      } catch {
        // Directory doesn't exist yet, return empty list
        files = [];
      }

      images = files.map((filename) => ({
        url: `/uploads/invitation-images/${user.wedding_id}/${filename}`,
        filename,
      }));
    }

    return NextResponse.json(images);
  } catch (error) {
    console.error('Error listing invitation images:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to list images' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Upload new image
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        { error: 'Wedding ID not found in user context' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!isValidImageType(file.type)) {
      return NextResponse.json(
        { error: 'Invalid image type. Supported types: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process image
    const result = await processTemplateImage(buffer, file.type);

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        { error: result.error || 'Failed to process image' },
        { status: 400 }
      );
    }

    // Generate filename
    const timestamp = Date.now();
    const randomId = randomUUID().split('-')[0];
    const filename = `invitation_${user.wedding_id}_${timestamp}_${randomId}.png`;
    const filepath = `uploads/invitation-images/${user.wedding_id}/${filename}`;

    // Upload to storage (Vercel Blob or filesystem)
    const uploadResult = await uploadFile(filepath, result.buffer, {
      contentType: 'image/png',
    });

    return NextResponse.json(
      {
        url: uploadResult.url,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading invitation image:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
