/**
 * Google Photos Migration API
 *
 * POST /api/admin/gallery/google-photos/migrate
 *
 * Uploads a batch of photos from blob storage to the wedding's Google Photos
 * album. Call repeatedly until `remaining` is 0.
 *
 * Body (optional): { batch_size?: number }  — default 10, max 20
 *
 * Response: { migrated: number, remaining: number, errors: string[] }
 *
 * Each photo that is successfully uploaded:
 *   - Has its url updated to the fresh Google Photos baseUrl
 *   - Has google_photos_media_id and url_expires_at set
 *   - Has its blob deleted (best-effort)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAnyRole } from '@/lib/auth/middleware';
import { deleteFile } from '@/lib/storage';
import { uploadToWeddingGooglePhotos } from '@/lib/google-photos/upload-helper';
import type { APIResponse } from '@/types/api';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);

    if (!user.wedding_id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No wedding associated with this account' },
      }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const batchSize = Math.min(20, Math.max(1, parseInt(body?.batch_size ?? '10')));

    // Check Google Photos is connected
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { google_photos_album_id: true, google_photos_refresh_token: true },
    });

    if (!wedding?.google_photos_album_id || !wedding?.google_photos_refresh_token) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'PRECONDITION_FAILED', message: 'Google Photos is not connected' },
      }, { status: 400 });
    }

    // Find photos that haven't been migrated yet (no media ID, still on blob)
    const pending = await prisma.weddingPhoto.findMany({
      where: {
        wedding_id: user.wedding_id,
        google_photos_media_id: null,
      },
      orderBy: { created_at: 'asc' },
      take: batchSize,
      select: { id: true, url: true, caption: true, sender_name: true },
    });

    const errors: string[] = [];
    let migrated = 0;

    for (const photo of pending) {
      const blobUrl = photo.url;
      try {
        // Fetch the image bytes from blob storage
        const fetchRes = await fetch(blobUrl);
        if (!fetchRes.ok) {
          errors.push(`Photo ${photo.id}: failed to fetch from blob (HTTP ${fetchRes.status})`);
          continue;
        }

        const buffer = Buffer.from(await fetchRes.arrayBuffer());
        const contentType = fetchRes.headers.get('content-type') ?? 'image/jpeg';

        // Derive filename from URL
        const filename = blobUrl.split('/').pop()?.split('?')[0] ?? `photo-${photo.id}.jpg`;
        const description = photo.caption ?? photo.sender_name ?? undefined;

        const result = await uploadToWeddingGooglePhotos(
          user.wedding_id!,
          buffer,
          filename,
          contentType,
          description
        );

        if (!result) {
          errors.push(`Photo ${photo.id}: Google Photos upload returned null (not connected?)`);
          continue;
        }

        // Update the photo record with Google Photos data
        await prisma.weddingPhoto.update({
          where: { id: photo.id },
          data: {
            url: result.baseUrl,
            thumbnail_url: `${result.baseUrl}=w400-h400-c`,
            google_photos_media_id: result.mediaId,
            url_expires_at: new Date(result.expiresAt),
          },
        });

        // Best-effort blob deletion
        try {
          await deleteFile(blobUrl);
        } catch (delErr) {
          console.warn(`[MIGRATE] Failed to delete blob for photo ${photo.id}:`, delErr);
        }

        migrated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[MIGRATE] Failed to migrate photo ${photo.id}:`, err);
        errors.push(`Photo ${photo.id}: ${msg}`);
      }
    }

    // Recalculate remaining after migration
    const newRemaining = await prisma.weddingPhoto.count({
      where: { wedding_id: user.wedding_id, google_photos_media_id: null },
    });

    return NextResponse.json<APIResponse>({
      success: true,
      data: { migrated, remaining: newRemaining, errors },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('UNAUTHORIZED') || message.startsWith('FORBIDDEN')) {
      return NextResponse.json<APIResponse>({ success: false, error: { code: 'UNAUTHORIZED', message } }, { status: 401 });
    }
    console.error('[MIGRATE]', err);
    return NextResponse.json<APIResponse>({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Migration failed' } }, { status: 500 });
  }
}

// GET – check how many photos are pending migration
export async function GET() {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);
    if (!user.wedding_id) return NextResponse.json<APIResponse>({ success: false, error: { code: 'FORBIDDEN', message: 'No wedding associated' } }, { status: 403 });

    const [pending, total] = await Promise.all([
      prisma.weddingPhoto.count({ where: { wedding_id: user.wedding_id, google_photos_media_id: null } }),
      prisma.weddingPhoto.count({ where: { wedding_id: user.wedding_id } }),
    ]);

    return NextResponse.json<APIResponse>({ success: true, data: { pending, total, migrated: total - pending } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('UNAUTHORIZED') || message.startsWith('FORBIDDEN')) {
      return NextResponse.json<APIResponse>({ success: false, error: { code: 'UNAUTHORIZED', message } }, { status: 401 });
    }
    return NextResponse.json<APIResponse>({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed' } }, { status: 500 });
  }
}
