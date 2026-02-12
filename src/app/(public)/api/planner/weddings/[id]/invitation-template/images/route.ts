/**
 * Planner Invitation Template Images API
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
import { prisma } from '@/lib/db/prisma';
import type { ImageFile } from '@/types/invitation-template';

/**
 * Helper to validate planner access to wedding
 */
async function validatePlannerAccess(plannerId: string, weddingId: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { planner_id: true },
  });

  if (!wedding) {
    return { valid: false, error: 'Wedding not found', status: 404 };
  }

  if (wedding.planner_id !== plannerId) {
    return { valid: false, error: 'You do not have access to this wedding', status: 403 };
  }

  return { valid: true };
}

// ============================================================================
// GET - List uploaded images
// ============================================================================

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json(
        { error: 'Planner ID not found in session' },
        { status: 403 }
      );
    }

    const { id: weddingId } = await params;

    // Validate planner access to wedding
    const accessCheck = await validatePlannerAccess(user.planner_id, weddingId);
    if (!accessCheck.valid) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status }
      );
    }

    let images: ImageFile[] = [];

    if (isUsingBlobStorage()) {
      // List files from Vercel Blob Storage
      const prefix = `uploads/invitation-images/${weddingId}/`;
      const { blobs } = await list({ prefix });

      images = blobs.map((blob) => ({
        url: blob.url,
        filename: blob.pathname.split('/').pop() || '',
      }));
    } else {
      // List files from local filesystem
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invitation-images', weddingId);

      let files: string[] = [];
      try {
        files = await fs.readdir(uploadDir);
      } catch {
        // Directory doesn't exist yet, return empty list
        files = [];
      }

      images = files.map((filename) => ({
        url: `/uploads/invitation-images/${weddingId}/${filename}`,
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json(
        { error: 'Planner ID not found in session' },
        { status: 403 }
      );
    }

    const { id: weddingId } = await params;

    // Validate planner access to wedding
    const accessCheck = await validatePlannerAccess(user.planner_id, weddingId);
    if (!accessCheck.valid) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status }
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
    const filename = `invitation_${weddingId}_${timestamp}_${randomId}.png`;
    const filepath = `uploads/invitation-images/${weddingId}/${filename}`;

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
