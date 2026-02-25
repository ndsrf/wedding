/**
 * Google Photos Library API client
 *
 * Handles OAuth 2.0 token management and Google Photos API calls:
 * - Creating shared albums
 * - Getting the contributor share URL
 * - Listing media items in an album
 * - Uploading a photo to an album
 *
 * Docs: https://developers.google.com/photos/library/reference/rest
 *
 * Required OAuth 2.0 scopes:
 *   https://www.googleapis.com/auth/photoslibrary
 *   https://www.googleapis.com/auth/photoslibrary.sharing
 */

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number; // ms since epoch
}

export interface GooglePhotosAlbum {
  id: string;
  title: string;
  productUrl: string; // URL to open in Google Photos
  shareInfo?: {
    sharedAlbumOptions?: {
      isCollaborative?: boolean;
      isCommentable?: boolean;
    };
    shareableUrl?: string;
    shareToken?: string;
    isJoined?: boolean;
    isOwned?: boolean;
    isJoinable?: boolean;
  };
  mediaItemsCount?: string;
  coverPhotoBaseUrl?: string;
}

export interface GooglePhotosMediaItem {
  id: string;
  description?: string;
  productUrl: string;
  baseUrl: string; // Short-lived (expires ~60 min), use =w<width>-h<height> suffix
  mimeType: string;
  mediaMetadata: {
    creationTime: string; // RFC 3339
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

/**
 * Refresh an expired Google access token using the refresh token.
 * Returns new tokens (the refresh_token is typically unchanged).
 */
export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to refresh Google token: ${text}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refreshToken,
    expiry_date: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Exchange an authorization code for tokens.
 * Used in the OAuth callback route.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to exchange Google auth code: ${text}`);
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Build the Google OAuth authorization URL for Google Photos scopes.
 */
export function buildGooglePhotosAuthUrl(
  redirectUri: string,
  state: string
): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID must be set');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/photoslibrary',
      'https://www.googleapis.com/auth/photoslibrary.sharing',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent', // Force consent screen to always get refresh_token
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ============================================================================
// Google Photos API calls (authenticated)
// ============================================================================

async function photosApiRequest(
  accessToken: string,
  path: string,
  options?: RequestInit
): Promise<Response> {
  const url = `${PHOTOS_API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
}

/**
 * Create a new Google Photos album with the given title.
 */
export async function createAlbum(
  accessToken: string,
  title: string
): Promise<GooglePhotosAlbum> {
  const res = await photosApiRequest(accessToken, '/albums', {
    method: 'POST',
    body: JSON.stringify({ album: { title } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create Google Photos album: ${text}`);
  }

  return res.json();
}

/**
 * Share an album so that anyone with the link can contribute.
 * Returns the share info including the shareableUrl.
 */
export async function shareAlbum(
  accessToken: string,
  albumId: string
): Promise<GooglePhotosAlbum['shareInfo']> {
  const res = await photosApiRequest(accessToken, `/albums/${albumId}:share`, {
    method: 'POST',
    body: JSON.stringify({
      sharedAlbumOptions: {
        isCollaborative: true,
        isCommentable: true,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to share Google Photos album: ${text}`);
  }

  const data = await res.json();
  return data.shareInfo;
}

/**
 * List media items in an album (up to maxResults, default 50).
 */
export async function listAlbumMediaItems(
  accessToken: string,
  albumId: string,
  maxResults = 50,
  pageToken?: string
): Promise<{ mediaItems: GooglePhotosMediaItem[]; nextPageToken?: string }> {
  const body: Record<string, unknown> = {
    albumId,
    pageSize: maxResults,
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await photosApiRequest(accessToken, '/mediaItems:search', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list Google Photos media items: ${text}`);
  }

  const data = await res.json();
  return {
    mediaItems: data.mediaItems ?? [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Upload a photo buffer to Google Photos and add it to an album.
 * Step 1: Upload bytes to get an upload token.
 * Step 2: Create media item using the upload token.
 */
export async function uploadPhotoToAlbum(
  accessToken: string,
  albumId: string,
  buffer: Buffer,
  filename: string,
  mimeType?: string,
  description?: string
): Promise<GooglePhotosMediaItem> {
  // Step 1: Upload raw bytes
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
    throw new Error(`Failed to upload photo to Google: ${text}`);
  }

  const uploadToken = await uploadRes.text();

  // Step 2: Create media item in album
  const createRes = await photosApiRequest(accessToken, '/mediaItems:batchCreate', {
    method: 'POST',
    body: JSON.stringify({
      albumId,
      newMediaItems: [
        {
          description: description ?? filename,
          simpleMediaItem: { uploadToken, fileName: filename },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create Google Photos media item: ${text}`);
  }

  const data = await createRes.json();
  const result = data.newMediaItemResults?.[0];

  if (result?.status?.code && result.status.code !== 0) {
    throw new Error(`Google Photos error: ${result.status.message}`);
  }

  return result?.mediaItem;
}
