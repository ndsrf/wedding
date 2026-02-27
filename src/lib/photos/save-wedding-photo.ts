/**
 * Shared wedding photo save logic.
 *
 * All upload paths (guest web, WhatsApp/Twilio, admin) funnel through
 * `saveWeddingPhoto`, which:
 *   1. Writes the buffer to blob storage as a temporary holding area.
 *   2. Attempts to forward the photo to the wedding's Google Photos album.
 *   3. Persists a WeddingPhoto record in the DB (using the Google Photos CDN
 *      URL when available, falling back to the blob URL).
 *   4. Deletes the temporary blob once the photo is safely in Google Photos.
 *
 * Returns the created WeddingPhoto row.
 */

import { prisma } from '@/lib/db/prisma';
import { uploadFile, deleteFile } from '@/lib/storage';
import { uploadToWeddingGooglePhotos } from '@/lib/google-photos/upload-helper';
import type { PhotoSource } from '@prisma/client';

export interface SaveWeddingPhotoParams {
  weddingId: string;
  buffer: Buffer;
  /** Unique filename, including extension (caller is responsible for uniqueness). */
  filename: string;
  contentType: string;
  source: PhotoSource;
  senderName?: string | null;
  caption?: string | null;
  /** Defaults to true. */
  approved?: boolean;
  /** Optional log prefix for debug messages, e.g. '[TWILIO_INBOUND]'. */
  logPrefix?: string;
}

export async function saveWeddingPhoto({
  weddingId,
  buffer,
  filename,
  contentType,
  source,
  senderName = null,
  caption = null,
  approved = true,
  logPrefix = '[SAVE_WEDDING_PHOTO]',
}: SaveWeddingPhotoParams) {
  const storagePath = `gallery/${weddingId}/${filename}`;
  const { url: blobUrl } = await uploadFile(storagePath, buffer, { contentType });

  let photoUrl = blobUrl;
  let thumbnailUrl: string | null = null;
  // Track blob URL for cleanup; set to null when we want to keep the blob.
  let deleteBlobUrl: string | null = blobUrl;
  let gPhotos: Awaited<ReturnType<typeof uploadToWeddingGooglePhotos>> = null;

  try {
    gPhotos = await uploadToWeddingGooglePhotos(
      weddingId,
      buffer,
      filename,
      contentType,
      caption ?? senderName ?? undefined
    );

    if (gPhotos) {
      // Use Google Photos CDN URL; thumbnail is a size-cropped variant.
      photoUrl = gPhotos.baseUrl;
      thumbnailUrl = `${gPhotos.baseUrl}=w400-h400-c`;
      console.log(`${logPrefix} Uploaded photo to Google Photos`, { weddingId, source });
    } else {
      // Google Photos not configured – keep blob URL, do not delete.
      deleteBlobUrl = null;
    }
  } catch (gErr) {
    console.error(`${logPrefix} Google Photos upload failed, keeping blob URL:`, gErr);
    deleteBlobUrl = null;
  }

  const photo = await prisma.weddingPhoto.create({
    data: {
      wedding_id: weddingId,
      url: photoUrl,
      thumbnail_url: thumbnailUrl,
      source,
      sender_name: senderName,
      caption,
      approved,
      ...(gPhotos
        ? {
            google_photos_media_id: gPhotos.mediaId,
            url_expires_at: new Date(gPhotos.expiresAt),
          }
        : {}),
    },
  });

  // Clean up the temporary blob now that the photo is safely in Google Photos.
  if (deleteBlobUrl) {
    try {
      await deleteFile(deleteBlobUrl);
    } catch (delErr) {
      console.warn(
        `${logPrefix} Failed to delete temp blob after Google Photos upload:`,
        delErr
      );
    }
  }

  return photo;
}
