/**
 * Google Photos Sync API
 *
 * POST /api/admin/gallery/google-photos/sync
 *
 * Fetches media items from the connected Google Photos album and saves any
 * new ones (by Google Photos ID) to the WeddingPhoto table for display in
 * the invitation gallery carousel.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAnyRole } from '@/lib/auth/middleware';
import {
  listAlbumMediaItems,
  refreshGoogleAccessToken,
} from '@/lib/google-photos/client';
import type { APIResponse } from '@/types/api';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const user = await requireAnyRole(['wedding_admin', 'planner', 'master_admin']);

    if (!user.wedding_id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No wedding associated with this account' },
      }, { status: 403 });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: {
        google_photos_album_id: true,
        google_photos_access_token: true,
        google_photos_refresh_token: true,
        google_photos_token_expiry: true,
      },
    });

    if (!wedding?.google_photos_album_id || !wedding.google_photos_refresh_token) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Google Photos not connected' },
      }, { status: 400 });
    }

    // Refresh token if expired (with 5 min buffer)
    let accessToken = wedding.google_photos_access_token ?? '';
    const expiryMs = wedding.google_photos_token_expiry?.getTime() ?? 0;
    if (!accessToken || Date.now() > expiryMs - 5 * 60 * 1000) {
      const newTokens = await refreshGoogleAccessToken(wedding.google_photos_refresh_token);
      accessToken = newTokens.access_token;

      await prisma.wedding.update({
        where: { id: user.wedding_id },
        data: {
          google_photos_access_token: newTokens.access_token,
          google_photos_token_expiry: newTokens.expiry_date
            ? new Date(newTokens.expiry_date)
            : null,
          ...(newTokens.refresh_token ? { google_photos_refresh_token: newTokens.refresh_token } : {}),
        },
      });
    }

    // Fetch media items from Google Photos
    const { mediaItems } = await listAlbumMediaItems(
      accessToken,
      wedding.google_photos_album_id,
      100
    );

    if (!mediaItems || mediaItems.length === 0) {
      return NextResponse.json<APIResponse>({
        success: true,
        data: { synced: 0, total: 0 },
      });
    }

    // Get existing photo URLs to avoid duplicates (use Google photo ID stored in URL)
    const existingPhotos = await prisma.weddingPhoto.findMany({
      where: { wedding_id: user.wedding_id, source: 'GOOGLE_PHOTOS' },
      select: { url: true },
    });
    const existingUrls = new Set(existingPhotos.map((p) => p.url));

    // Upsert new photos — use baseUrl as the stored URL (note: baseUrl expires after ~60min,
    // but we re-sync on display. The mediaItem.id is embedded in the url path for dedup.)
    const toCreate = mediaItems.filter((item) => {
      // Use the productUrl (stable) as the dedup key
      return !existingUrls.has(item.productUrl);
    });

    if (toCreate.length > 0) {
      await prisma.weddingPhoto.createMany({
        data: toCreate.map((item) => ({
          wedding_id: user.wedding_id!,
          url: item.productUrl, // Stable Google Photos URL
          thumbnail_url: `${item.baseUrl}=w400-h400-c`, // Cropped thumbnail
          source: 'GOOGLE_PHOTOS' as const,
          sender_name: item.contributorInfo?.displayName ?? null,
          approved: true,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: { synced: toCreate.length, total: mediaItems.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('UNAUTHORIZED') || message.startsWith('FORBIDDEN')) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: { code: 'UNAUTHORIZED', message },
      }, { status: 401 });
    }
    console.error('[GOOGLE_PHOTOS_SYNC]', err);
    return NextResponse.json<APIResponse>({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to sync from Google Photos' },
    }, { status: 500 });
  }
}
