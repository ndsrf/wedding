/**
 * Public Gallery Upload API
 *
 * POST /api/public/gallery/[weddingId]/upload
 *
 * Allows guests (no auth required) to upload photos to a wedding gallery.
 * Accessible via QR code shared in the invitation.
 *
 * Basic rate-limiting: 10 photos per IP per hour (tracked in-memory, resets on restart).
 * For production, use Redis or a database-backed rate limiter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { uploadFile, deleteFile, generateUniqueFilename } from '@/lib/storage';
import { uploadToWeddingGooglePhotos } from '@/lib/google-photos/upload-helper';
import type { APIResponse } from '@/types/api';

export const runtime = 'nodejs';

// Simple in-memory rate limiter: ip → { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ weddingId: string }> }
) {
  try {
    const { weddingId } = await params;

    // Rate limiting by IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many uploads. Please try again later.' },
      }, { status: 429 });
    }

    // Verify wedding exists and is active
    const wedding = await prisma.wedding.findFirst({
      where: { id: weddingId, status: 'ACTIVE', is_disabled: false },
      select: { id: true },
    });

    if (!wedding) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Wedding not found' },
      }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const senderName = (formData.get('sender_name') as string | null)?.trim().slice(0, 100) ?? null;
    const caption = (formData.get('caption') as string | null)?.trim().slice(0, 300) ?? null;

    if (!file) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file provided' },
      }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Only image files are allowed' },
      }, { status: 400 });
    }

    // 10 MB limit for guest uploads
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'File too large (max 10 MB)' },
      }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = generateUniqueFilename(file.name);
    const storagePath = `gallery/${weddingId}/${filename}`;

    // Upload to blob storage as temporary holding area
    const { url: blobUrl } = await uploadFile(storagePath, buffer, { contentType: file.type });

    // Best-effort: try to forward the photo to the wedding's Google Photos album
    let photoUrl = blobUrl;
    let thumbnailUrl: string | null = null;
    let deleteBlobUrl: string | null = blobUrl;

    try {
      const gPhotos = await uploadToWeddingGooglePhotos(
        weddingId,
        buffer,
        filename,
        file.type,
        caption ?? senderName ?? undefined
      );

      if (gPhotos) {
        // Use Google Photos CDN URL for display; thumbnail is a cropped variant
        photoUrl = gPhotos.baseUrl;
        thumbnailUrl = `${gPhotos.baseUrl}=w400-h400-c`;
        console.log('[PUBLIC_GALLERY_UPLOAD] Uploaded photo to Google Photos', { weddingId });
      } else {
        // Google Photos not configured – keep blob URL, do not delete
        deleteBlobUrl = null;
      }
    } catch (gErr) {
      console.error('[PUBLIC_GALLERY_UPLOAD] Google Photos upload failed, keeping blob URL:', gErr);
      deleteBlobUrl = null;
    }

    const photo = await prisma.weddingPhoto.create({
      data: {
        wedding_id: weddingId,
        url: photoUrl,
        thumbnail_url: thumbnailUrl,
        source: 'UPLOAD',
        sender_name: senderName,
        caption,
        approved: true,
        ...(gPhotos ? {
          google_photos_media_id: gPhotos.mediaId,
          url_expires_at: new Date(gPhotos.expiresAt),
        } : {}),
      },
    });

    // Clean up blob now that the photo is safely in Google Photos
    if (deleteBlobUrl) {
      try {
        await deleteFile(deleteBlobUrl);
      } catch (delErr) {
        console.warn('[PUBLIC_GALLERY_UPLOAD] Failed to delete temp blob after Google Photos upload:', delErr);
      }
    }

    return NextResponse.json<APIResponse>({ success: true, data: photo }, { status: 201 });
  } catch (err) {
    console.error('[PUBLIC_GALLERY_UPLOAD]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to upload photo' },
    }, { status: 500 });
  }
}
