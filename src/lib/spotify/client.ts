/**
 * Spotify Web API client
 *
 * Nupci uses a single Spotify service account it owns (not a per-wedding
 * OAuth connection like Google Photos). Two token flows:
 *   - Client Credentials: app-only token, used for public track search.
 *   - Refresh Token: exchanges SPOTIFY_REFRESH_TOKEN for a user token with
 *     playlist-modify-public, playlist-modify-private + ugc-image-upload scopes, used to manage the
 *     per-wedding playlists.
 * Both tokens are cached in module memory for the life of the process.
 *
 * NOTE: Spotify requires the account that owns the Developer app to have an
 * active Premium subscription for /v1/search (Client Credentials calls fail
 * with 403 "Active premium subscription required for the owner of the app"
 * otherwise). See README.md → "Spotify Integration".
 */

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export interface SpotifyTrack {
  id: string;
  uri: string;
  title: string;
  artist: string;
  albumArtUrl: string | null;
}

export interface SpotifyPlaylist {
  id: string;
  url: string;
}

// ============================================================================
// Configuration
// ============================================================================

export function isSpotifyConfigured(): boolean {
  return !!(
    process.env.SPOTIFY_CLIENT_ID &&
    process.env.SPOTIFY_CLIENT_SECRET &&
    process.env.SPOTIFY_REFRESH_TOKEN
  );
}

// ============================================================================
// Token caching
// ============================================================================

interface CachedToken {
  accessToken: string;
  expiresAt: number; // ms since epoch
}

let appToken: CachedToken | null = null;
let userToken: CachedToken | null = null;

function isFresh(token: CachedToken | null): token is CachedToken {
  return !!token && Date.now() < token.expiresAt - 60_000;
}

async function requestToken(params: URLSearchParams): Promise<CachedToken> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to obtain Spotify token (HTTP ${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/** App-only token (Client Credentials flow) — used for public catalog search. */
export async function getAppAccessToken(): Promise<string> {
  if (isFresh(appToken)) return appToken.accessToken;
  appToken = await requestToken(new URLSearchParams({ grant_type: 'client_credentials' }));
  return appToken.accessToken;
}

/** Nupci service-account token (Refresh Token flow) — used for playlist management. */
export async function getUserAccessToken(): Promise<string> {
  if (isFresh(userToken)) return userToken.accessToken;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!refreshToken) throw new Error('SPOTIFY_REFRESH_TOKEN must be set');

  userToken = await requestToken(
    new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
  );
  return userToken.accessToken;
}

// ============================================================================
// Authenticated API helper
// ============================================================================

async function spotifyApiRequest(accessToken: string, path: string, options?: RequestInit): Promise<Response> {
  const url = path.startsWith('http') ? path : `${SPOTIFY_API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
}

// ============================================================================
// Search
// ============================================================================

const ISO_COUNTRY_RE = /^[A-Z]{2}$/;

/** Normalizes a market/country code, falling back to "ES" when missing or invalid. */
export function normalizeMarket(market: string | null | undefined): string {
  const upper = (market ?? '').toUpperCase();
  return ISO_COUNTRY_RE.test(upper) ? upper : 'ES';
}

function mapTrack(track: Record<string, unknown>): SpotifyTrack {
  const artists = (track.artists as Array<{ name: string }> | undefined) ?? [];
  const images = (track.album as { images?: Array<{ url: string }> } | undefined)?.images;
  return {
    id: track.id as string,
    uri: track.uri as string,
    title: track.name as string,
    artist: artists.map((a) => a.name).join(', '),
    albumArtUrl: images?.[0]?.url ?? null,
  };
}

export async function searchTracks(query: string, market: string): Promise<SpotifyTrack[]> {
  const token = await getAppAccessToken();
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    market: normalizeMarket(market),
    limit: '5',
  });

  const res = await spotifyApiRequest(token, `/search?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify search failed (HTTP ${res.status}): ${text}`);
  }

  const data = await res.json();
  const items: Array<Record<string, unknown>> = data.tracks?.items ?? [];
  return items.map(mapTrack);
}

/** Resolves the single best-match track for an AI-extracted artist/track pair. */
export async function findTrack(artist: string, track: string, market: string): Promise<SpotifyTrack | null> {
  const results = await searchTracks(`artist:${artist} track:${track}`, market);
  return results[0] ?? null;
}

// ============================================================================
// Playlist management (Nupci service-account token)
// ============================================================================

/**
 * Creates a playlist owned by the authenticated (Nupci) account, preferring
 * public visibility.
 *
 * Uses `POST /v1/me/playlists` — Spotify's February 2026 Web API migration
 * removed `POST /v1/users/{user_id}/playlists` for Development Mode apps
 * (403 for every caller past the March 9 2026 deadline, regardless of token,
 * scopes, or whether user_id was correct).
 *
 * Some apps that haven't been through Spotify's Extended Quota review still
 * get a 403 creating a PUBLIC playlist even via this endpoint — in that case
 * we transparently retry as private. A private playlist is still fully
 * reachable via its direct open.spotify.com link (the "public" flag only
 * affects whether it's listed on the owner's profile/search), so this
 * doesn't break sharing the playlist with guests.
 */
export async function createPlaylist(name: string, description: string): Promise<SpotifyPlaylist> {
  const token = await getUserAccessToken();
  const path = '/me/playlists';

  let res = await spotifyApiRequest(token, path, {
    method: 'POST',
    body: JSON.stringify({ name, description, public: true }),
  });

  if (res.status === 403) {
    res = await spotifyApiRequest(token, path, {
      method: 'POST',
      body: JSON.stringify({ name, description, public: false }),
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create Spotify playlist (HTTP ${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    url: data.external_urls?.spotify ?? `https://open.spotify.com/playlist/${data.id}`,
  };
}

/** Uploads a playlist cover. `jpegBase64` must be a raw base64 JPEG string, <256KB. */
export async function uploadPlaylistCover(playlistId: string, jpegBase64: string): Promise<void> {
  const token = await getUserAccessToken();
  const res = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/images`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'image/jpeg',
    },
    body: jpegBase64,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to upload Spotify playlist cover (HTTP ${res.status}): ${text}`);
  }
}

/** Returns the set of track URIs already in the playlist, for dedup before adding. */
export async function getPlaylistTrackUris(playlistId: string): Promise<Set<string>> {
  const token = await getUserAccessToken();
  const uris = new Set<string>();
  let path: string | null = `/playlists/${playlistId}/tracks?fields=next,items(track(uri))&limit=100`;

  while (path) {
    const res: Response = await spotifyApiRequest(token, path);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch Spotify playlist tracks (HTTP ${res.status}): ${text}`);
    }
    const data = await res.json();
    for (const item of (data.items ?? []) as Array<{ track?: { uri?: string } }>) {
      if (item.track?.uri) uris.add(item.track.uri);
    }
    path = data.next ?? null;
  }

  return uris;
}

/** Adds tracks to a playlist in batches of 100 (Spotify's per-request limit). */
export async function addTracksToPlaylist(playlistId: string, uris: string[]): Promise<void> {
  const token = await getUserAccessToken();
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const res = await spotifyApiRequest(token, `/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris: batch }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to add tracks to Spotify playlist (HTTP ${res.status}): ${text}`);
    }
  }
}
