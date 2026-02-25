/**
 * Google Photos Upload Helper
 *
 * Shared utility for uploading photos directly to a wedding's connected
 * Google Photos album. Used by both the WhatsApp webhook and the public
 * guest gallery upload API.
 *
 * Flow:
 *   1. Check if the wedding has Google Photos connected.
 *   2. Refresh the access token if it is expired (save new tokens back to DB).
 *   3. Upload the image buffer to the Google Photos album.
 *   4. Return the resulting media item (baseUrl + productUrl).
 *
 * Returns null when Google Photos is not configured for the wedding or when
 * the caller should fall back to blob-only storage (e.g. on error, callers
 * choose whether to propagate or swallow).
 */

import { prisma } from '@/lib/db/prisma';
import { refreshGoogleAccessToken, uploadPhotoToAlbum } from './client';
import type { GooglePhotosMediaItem } from './client';

export interface GooglePhotosUploadResult {
  /** The uploaded media item returned by the Google Photos API. */
  mediaItem: GooglePhotosMediaItem;
  /**
   * Convenience accessor: short-lived CDN URL suitable for <img src>.
   * Expires after ~60 minutes. Append sizing parameters such as =w800-h800.
   */
  baseUrl: string;
  /**
   * Stable Google Photos product URL (web-app link, not directly embeddable
   * as an image). Safe to use as a dedup key.
   */
  productUrl: string;
}

/**
 * Attempt to upload a photo to the wedding's connected Google Photos album.
 *
 * @returns The upload result on success, or `null` if Google Photos is not
 *          configured for the wedding (callers should fall back to blob-only).
 * @throws  If Google Photos IS configured but the upload fails (callers should
 *          handle the error and decide whether to fall back).
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
    // Google Photos not connected for this wedding – caller falls back to blob.
    return null;
  }

  // Refresh the access token when it is missing or within 5 minutes of expiry.
  let accessToken = wedding.google_photos_access_token ?? '';
  const expiryMs = wedding.google_photos_token_expiry?.getTime() ?? 0;

  if (!accessToken || Date.now() > expiryMs - 5 * 60 * 1000) {
    const newTokens = await refreshGoogleAccessToken(wedding.google_photos_refresh_token);
    accessToken = newTokens.access_token;

    await prisma.wedding.update({
      where: { id: weddingId },
      data: {
        google_photos_access_token: newTokens.access_token,
        google_photos_token_expiry: newTokens.expiry_date
          ? new Date(newTokens.expiry_date)
          : null,
        ...(newTokens.refresh_token
          ? { google_photos_refresh_token: newTokens.refresh_token }
          : {}),
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

  return {
    mediaItem,
    baseUrl: mediaItem.baseUrl,
    productUrl: mediaItem.productUrl,
  };
}
