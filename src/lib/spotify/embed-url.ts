/**
 * Spotify embed URL helpers — pure, isomorphic (no env vars, no fetch), safe
 * to import from client components. Used by the invitation-builder Spotify
 * block (settings panel + renderer) to turn whatever a planner pastes
 * (a full playlist URL, a `spotify:playlist:` URI, or a bare ID) into a
 * validated playlist ID, and that ID into an `open.spotify.com/embed` URL.
 */

const SPOTIFY_ID_RE = /^[a-zA-Z0-9]{15,30}$/;

/**
 * Extracts a Spotify playlist ID from a pasted URL, URI, or bare ID.
 * Returns null if nothing that looks like a valid ID can be found — the
 * caller should treat that as "no playlist configured" rather than embedding
 * an arbitrary/unvalidated string into an iframe src.
 */
export function extractSpotifyPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // https://open.spotify.com/playlist/{id}?si=... or spotify:playlist:{id}
  const match = trimmed.match(/playlist[/:]([a-zA-Z0-9]+)/);
  if (match) return match[1];

  // Already a bare ID (Spotify IDs are base62, 22 chars — allow a bit of slack)
  if (SPOTIFY_ID_RE.test(trimmed)) return trimmed;

  return null;
}

/** Builds the `open.spotify.com/embed/playlist/...` iframe src for a validated playlist ID. */
export function buildSpotifyPlaylistEmbedUrl(playlistId: string, autoplay: boolean): string {
  const params = new URLSearchParams({ utm_source: 'generator' });
  if (autoplay) params.set('autoplay', '1');
  return `https://open.spotify.com/embed/playlist/${playlistId}?${params.toString()}`;
}
