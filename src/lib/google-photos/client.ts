/**
 * Google Photos Library API client
 *
 * Scope changes effective April 1 2025:
 *   - photoslibrary (full access)  → REMOVED
 *   - photoslibrary.readonly       → REMOVED
 *   - photoslibrary.sharing        → REMOVED
 *   - photoslibrary.appendonly     → STILL WORKS (upload + create albums)
 *   - photoslibrary.readonly.appcreateddata → STILL WORKS (read app-created items)
 *
 * This client only uses the two scopes above. Apps can read back media items
 * they uploaded but cannot access the user's full photo library.
 */

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number; // ms since epoch
}

export interface GooglePhotosAlbum {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount?: string;
  coverPhotoBaseUrl?: string;
}

export interface GooglePhotosMediaItem {
  id: string;
  description?: string;
  productUrl: string;
  baseUrl: string; // Short-lived (expires ~60 min), append =w<N>-h<N> for sizing
  mimeType: string;
  mediaMetadata: {
    creationTime: string;
    width?: string;
    height?: string;
    photo?: Record<string, unknown>;
    video?: Record<string, unknown>;
  };
  contributorInfo?: {
    profilePictureBaseUrl?: string;
    displayName?: string;
  };
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PHOTOS_API_BASE = 'https://photoslibrary.googleapis.com/v1';

// OAuth scopes that remain active after the April 2025 API changes
export const GOOGLE_PHOTOS_SCOPES = [
  'https://www.googleapis.com/auth/photoslibrary.appendonly',
  'https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata',
].join(' ');

// ============================================================================
// OAuth helpers
// ============================================================================

export function buildGooglePhotosAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID must be set');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_PHOTOS_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to exchange Google auth code (HTTP ${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to refresh Google token (HTTP ${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expiry_date: Date.now() + data.expires_in * 1000,
  };
}

// ============================================================================
// Authenticated API helper
// ============================================================================

async function photosApiRequest(accessToken: string, path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${PHOTOS_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
}

// ============================================================================
// Albums  (appendonly scope)
// ============================================================================

export async function createAlbum(accessToken: string, title: string): Promise<GooglePhotosAlbum> {
  const res = await photosApiRequest(accessToken, '/albums', {
    method: 'POST',
    body: JSON.stringify({ album: { title } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create Google Photos album (HTTP ${res.status}): ${text}`);
  }

  return res.json();
}

// ============================================================================
// Media items – upload  (appendonly scope)
// ============================================================================

/**
 * Upload a photo buffer to Google Photos and add it to an album.
 * Returns the created media item including its permanent ID and a fresh baseUrl.
 */
export async function uploadPhotoToAlbum(
  accessToken: string,
  albumId: string,
  buffer: Buffer,
  filename: string,
  mimeType?: string,
  description?: string
): Promise<GooglePhotosMediaItem> {
  // Step 1: upload raw bytes → receive upload token
  const uploadRes = await fetch(`${PHOTOS_API_BASE}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'X-Goog-Upload-Content-Type': mimeType ?? 'image/jpeg',
      'X-Goog-Upload-Protocol': 'raw',
      'X-Goog-Upload-File-Name': filename,
    },
    body: buffer as unknown as BodyInit,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Failed to upload photo bytes to Google (HTTP ${uploadRes.status}): ${text}`);
  }

  const uploadToken = await uploadRes.text();

  // Step 2: create media item in album
  const createRes = await photosApiRequest(accessToken, '/mediaItems:batchCreate', {
    method: 'POST',
    body: JSON.stringify({
      albumId,
      newMediaItems: [{
        description: description ?? filename,
        simpleMediaItem: { uploadToken, fileName: filename },
      }],
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create Google Photos media item (HTTP ${createRes.status}): ${text}`);
  }

  const data = await createRes.json();
  const result = data.newMediaItemResults?.[0];

  if (result?.status?.code && result.status.code !== 0) {
    throw new Error(`Google Photos error: ${result.status.message}`);
  }

  return result?.mediaItem;
}

// ============================================================================
// Media items – read  (readonly.appcreateddata scope)
// ============================================================================

/**
 * Fetch fresh baseUrls for up to 50 media items by their permanent IDs.
 * Call this whenever stored baseUrls are expired or about to expire.
 */
export async function batchGetMediaItems(
  accessToken: string,
  mediaItemIds: string[]
): Promise<GooglePhotosMediaItem[]> {
  if (mediaItemIds.length === 0) return [];
  if (mediaItemIds.length > 50) throw new Error('batchGetMediaItems: max 50 IDs per call');

  const params = new URLSearchParams();
  for (const id of mediaItemIds) params.append('mediaItemIds', id);

  const res = await fetch(`${PHOTOS_API_BASE}/mediaItems:batchGet?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to batch-get Google Photos media items (HTTP ${res.status}): ${text}`);
  }

  const data = await res.json();
  return (data.mediaItemResults ?? [])
    .filter((r: { mediaItem?: GooglePhotosMediaItem }) => r.mediaItem)
    .map((r: { mediaItem: GooglePhotosMediaItem }) => r.mediaItem);
}

/**
 * List media items created by this app in a specific album.
 * Requires readonly.appcreateddata scope — only returns items this app uploaded.
 */
export async function listAlbumMediaItems(
  accessToken: string,
  albumId: string,
  maxResults = 50,
  pageToken?: string
): Promise<{ mediaItems: GooglePhotosMediaItem[]; nextPageToken?: string }> {
  const body: Record<string, unknown> = { albumId, pageSize: maxResults };
  if (pageToken) body.pageToken = pageToken;

  const res = await photosApiRequest(accessToken, '/mediaItems:search', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list Google Photos media items (HTTP ${res.status}): ${text}`);
  }

  const data = await res.json();
  return { mediaItems: data.mediaItems ?? [], nextPageToken: data.nextPageToken };
}
