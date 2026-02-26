/**
 * Google Photos Upload Helper
 *
 * The Google Photos Library API was shut down on March 31 2025.
 * Programmatic uploads are no longer possible.
 *
 * This module is kept so existing import sites continue to compile.
 * It always returns null, causing callers to fall back to blob-only storage.
 */

export interface GooglePhotosUploadResult {
  mediaItem: never;
  baseUrl: string;
  productUrl: string;
}

/**
 * Always returns null – Google Photos programmatic upload is no longer available.
 * Callers should fall back to blob-only storage.
 */
export async function uploadToWeddingGooglePhotos(
  _weddingId: string,
  _buffer: Buffer,
  _filename: string,
  _mimeType: string,
  _description?: string
): Promise<GooglePhotosUploadResult | null> {
  return null;
}
