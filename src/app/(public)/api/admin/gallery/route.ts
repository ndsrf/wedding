/**
 * Admin Gallery API
 *
 * GET  /api/admin/gallery        - List all photos for the wedding (paginated)
 * POST /api/admin/gallery        - Upload a photo to the gallery
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAnyRole } from '@/lib/auth/middleware';
import { generateUniqueFilename } from '@/lib/storage';
import { saveWeddingPhoto } from '@/lib/photos/save-wedding-photo';
import { batchGetMediaItems } from '@/lib/google-photos/client';
import { getWeddingAccessToken } from '@/lib/google-photos/upload-helper';
import type { APIResponse } from '@/types/api';

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh URLs 5 min before expiry
const URL_TTL_MS = 55 * 60 * 1000;       // 55 min safe TTL for stored baseUrls

export const runtime = 'nodejs';

// ============================================================================
// GET – list photos
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);

    if (!user.wedding_id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No wedding associated with this account' },
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const approved = searchParams.get('approved');

    const where = {
      wedding_id: user.wedding_id,
      ...(approved !== null ? { approved: approved === 'true' } : {}),
    };

    const [photos, total] = await Promise.all([
      prisma.weddingPhoto.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.weddingPhoto.count({ where }),
    ]);

    // Lazily refresh expired Google Photos baseUrls (same logic as public gallery)
    const now = Date.now();
    const expiredPhotos = photos.filter(
      (p) => p.google_photos_media_id &&
             (!p.url_expires_at || p.url_expires_at.getTime() - now < REFRESH_BUFFER_MS)
    );

    if (expiredPhotos.length > 0) {
      try {
        const accessToken = await getWeddingAccessToken(user.wedding_id);
        if (accessToken) {
          const mediaIds = expiredPhotos.map((p) => p.google_photos_media_id!).slice(0, 50);
          const refreshed = await batchGetMediaItems(accessToken, mediaIds);
          const newExpiry = new Date(now + URL_TTL_MS);
          const byId = new Map(refreshed.map((item) => [item.id, item]));

          await Promise.all(
            expiredPhotos.map(async (photo) => {
              const item = byId.get(photo.google_photos_media_id!);
              if (!item) return;
              const newUrl = item.baseUrl;
              const newThumb = `${item.baseUrl}=w400-h400-c`;
              photo.url = newUrl;
              photo.thumbnail_url = newThumb;
              photo.url_expires_at = newExpiry;
              await prisma.weddingPhoto.update({
                where: { id: photo.id },
                data: { url: newUrl, thumbnail_url: newThumb, url_expires_at: newExpiry },
              });
            })
          );
        }
      } catch (refreshErr) {
        // Non-fatal: serve potentially stale URLs
        console.warn('[ADMIN_GALLERY_GET] URL refresh failed:', refreshErr);
      }
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: photos,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('UNAUTHORIZED') || message.startsWith('FORBIDDEN')) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'UNAUTHORIZED', message },
      }, { status: 401 });
    }
    console.error('[GALLERY_GET]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch photos' },
    }, { status: 500 });
  }
}

// ============================================================================
// POST – upload a photo
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);

    if (!user.wedding_id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No wedding associated with this account' },
      }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caption = (formData.get('caption') as string | null) ?? undefined;

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = generateUniqueFilename(file.name);

    const photo = await saveWeddingPhoto({
      weddingId: user.wedding_id,
      buffer,
      filename,
      contentType: file.type,
      source: 'UPLOAD',
      senderName: user.name,
      caption: caption ?? null,
      approved: true,
      logPrefix: '[ADMIN_GALLERY_UPLOAD]',
    });

    return NextResponse.json<APIResponse>({ success: true, data: photo }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('UNAUTHORIZED') || message.startsWith('FORBIDDEN')) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'UNAUTHORIZED', message },
      }, { status: 401 });
    }
    console.error('[GALLERY_POST]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to upload photo' },
    }, { status: 500 });
  }
}
