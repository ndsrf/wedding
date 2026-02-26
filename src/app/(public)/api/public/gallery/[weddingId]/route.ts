/**
 * Public Gallery API
 *
 * GET /api/public/gallery/[weddingId]?cursor=<lastPhotoId>&limit=<n>
 *
 * Returns approved photos for a wedding, cursor-paginated (newest first).
 * Before returning, lazily refreshes any expired Google Photos baseUrls
 * (Google Photos baseUrls expire after ~60 minutes).
 *
 * Response:
 *   { success: true, data: Photo[], meta: { hasMore: bool, nextCursor: string|null } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { batchGetMediaItems } from '@/lib/google-photos/client';
import { getWeddingAccessToken } from '@/lib/google-photos/upload-helper';
import type { APIResponse } from '@/types/api';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh URLs 5 min before expiry
const URL_TTL_MS = 55 * 60 * 1000;       // 55 min safe TTL for stored baseUrls

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ weddingId: string }> }
) {
  try {
    const { weddingId } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT))));

    // Resolve cursor to a timestamp for keyset pagination
    let cursorDate: Date | undefined;
    if (cursor) {
      const ref = await prisma.weddingPhoto.findUnique({ where: { id: cursor }, select: { created_at: true } });
      cursorDate = ref?.created_at;
    }

    const photos = await prisma.weddingPhoto.findMany({
      where: {
        wedding_id: weddingId,
        approved: true,
        ...(cursorDate ? { created_at: { lt: cursorDate } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: limit + 1, // one extra to detect hasMore
      select: {
        id: true,
        url: true,
        thumbnail_url: true,
        source: true,
        sender_name: true,
        caption: true,
        google_photos_media_id: true,
        url_expires_at: true,
        created_at: true,
      },
    });

    const hasMore = photos.length > limit;
    const page = hasMore ? photos.slice(0, limit) : photos;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    // Lazily refresh expired Google Photos baseUrls
    const now = Date.now();
    const expiredPhotos = page.filter(
      (p) => p.google_photos_media_id &&
             (!p.url_expires_at || p.url_expires_at.getTime() - now < REFRESH_BUFFER_MS)
    );

    if (expiredPhotos.length > 0) {
      try {
        const accessToken = await getWeddingAccessToken(weddingId);
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
        console.warn('[PUBLIC_GALLERY] URL refresh failed:', refreshErr);
      }
    }

    // Strip internal fields before returning to client
    const result = page.map(({ google_photos_media_id: _gp, url_expires_at: _exp, ...rest }) => rest);

    return NextResponse.json<APIResponse>({
      success: true,
      data: result,
      meta: { hasMore, nextCursor },
    });
  } catch (err) {
    console.error('[PUBLIC_GALLERY_GET]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch photos' },
    }, { status: 500 });
  }
}
