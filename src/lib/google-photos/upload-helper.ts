/**
 * Google Photos Upload Helper
 *
 * Uploads a photo to the wedding's connected Google Photos album.
 * Refreshes the access token when needed and saves new tokens back to the DB.
 *
 * Returns null when Google Photos is not configured for the wedding (callers
 * should fall back to blob-only storage).
 */

import { prisma } from '@/lib/db/prisma';
import { refreshGoogleAccessToken, uploadPhotoToAlbum } from './client';
import type { GooglePhotosMediaItem } from './client';

export interface GooglePhotosUploadResult {
  mediaItem: GooglePhotosMediaItem;
  /** Permanent media item ID — store in DB for future URL refresh. */
  mediaId: string;
  /** Short-lived CDN base URL (~60 min). Append =w800 etc. for sizing. */
  baseUrl: string;
  /** Approx. timestamp (ms) when baseUrl expires. */
  expiresAt: number;
}

/**
 * Attempt to upload a photo to the wedding's connected Google Photos album.
 *
 * @returns Upload result on success, or `null` if Google Photos is not
 *          configured for the wedding (caller should use blob-only storage).
 * @throws  If Google Photos IS configured but the upload fails.
 */
export async function uploadToWeddingGooglePhotos(
  weddingId: string,
  buffer: Buffer,
  filename: string,
  mimeType: string,
  description?: string
): Promise<GooglePhotosUploadResult | null> {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: {
      google_photos_album_id: true,
      google_photos_access_token: true,
      google_photos_refresh_token: true,
      google_photos_token_expiry: true,
    },
  });

  if (!wedding?.google_photos_album_id || !wedding.google_photos_refresh_token) {
    return null;
  }

  // Refresh the access token when missing or within 5 minutes of expiry
  let accessToken = wedding.google_photos_access_token ?? '';
  const expiryMs = wedding.google_photos_token_expiry?.getTime() ?? 0;

  if (!accessToken || Date.now() > expiryMs - 5 * 60 * 1000) {
    const newTokens = await refreshGoogleAccessToken(wedding.google_photos_refresh_token);
    accessToken = newTokens.access_token;

    await prisma.wedding.update({
      where: { id: weddingId },
      data: {
        google_photos_access_token: newTokens.access_token,
        google_photos_token_expiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
        ...(newTokens.refresh_token ? { google_photos_refresh_token: newTokens.refresh_token } : {}),
      },
    });
  }

  const mediaItem = await uploadPhotoToAlbum(
    accessToken,
    wedding.google_photos_album_id,
    buffer,
    filename,
    mimeType,
    description
  );

  // baseUrls expire in ~60 minutes
  const expiresAt = Date.now() + 55 * 60 * 1000; // 55 min to be safe

  return {
    mediaItem,
    mediaId: mediaItem.id,
    baseUrl: mediaItem.baseUrl,
    expiresAt,
  };
}

/**
 * Return a fresh access token for the wedding's Google Photos connection.
 * Returns null if Google Photos is not connected.
 */
export async function getWeddingAccessToken(weddingId: string): Promise<string | null> {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: {
      google_photos_refresh_token: true,
      google_photos_access_token: true,
      google_photos_token_expiry: true,
    },
  });

  if (!wedding?.google_photos_refresh_token) return null;

  let accessToken = wedding.google_photos_access_token ?? '';
  const expiryMs = wedding.google_photos_token_expiry?.getTime() ?? 0;

  if (!accessToken || Date.now() > expiryMs - 5 * 60 * 1000) {
    const newTokens = await refreshGoogleAccessToken(wedding.google_photos_refresh_token);
    accessToken = newTokens.access_token;

    await prisma.wedding.update({
      where: { id: weddingId },
      data: {
        google_photos_access_token: newTokens.access_token,
        google_photos_token_expiry: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
        ...(newTokens.refresh_token ? { google_photos_refresh_token: newTokens.refresh_token } : {}),
      },
    });
  }

  return accessToken;
}
