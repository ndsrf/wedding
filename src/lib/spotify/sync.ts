/**
 * Spotify playlist nightly sync
 *
 * Runs once a day (via the cron job registry) for every wedding whose
 * planner has `spotify_sync_enabled`. For each such wedding:
 *   1. Resolves PENDING_AI song suggestions (free text typed by guests)
 *      into a real Spotify track via an LLM extraction step + catalog search.
 *   2. Adds all READY suggestions to the wedding's Spotify playlist,
 *      creating the playlist (with cover) on first use.
 *
 * Sends no notifications — metrics are only logged by the cron runner.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import sharp from 'sharp';
import { prisma } from '@/lib/db/prisma';
import { getChatModel } from '@/lib/ai/provider';
import {
  isSpotifyConfigured,
  findTrack,
  createPlaylist,
  uploadPlaylistCover,
  getPlaylistTrackUris,
  addTracksToPlaylist,
  type SpotifyPlaylist,
} from './client';

export interface SpotifySyncMetrics {
  weddings_processed: number;
  processed_ai: number;
  discarded: number;
  ai_failed: number;
  added_to_playlist: number;
  playlists_created: number;
  errors: number;
}

interface WeddingForSync {
  id: string;
  couple_names: string;
  wedding_date: Date;
  wedding_country: string;
  default_language: string;
  spotify_playlist_id: string | null;
  spotify_playlist_url: string | null;
  planner: { logo_url: string | null };
}

// ============================================================================
// Step 1 — resolve PENDING_AI suggestions
// ============================================================================

const pendingAiSchema = z.object({
  isValidTrack: z.boolean(),
  artist: z.string().nullable(),
  track: z.string().nullable(),
});

function buildPendingAiPrompt(rawInput: string): string {
  return `A wedding guest was asked to suggest a song for the wedding playlist. They wrote (possibly in Spanish, English, French, Italian, German, or another language):

"${rawInput}"

Determine whether this text identifies a specific, real song. Return isValidTrack: false if the text is a joke, a non-answer, or too vague to identify one specific song (e.g. "cualquiera está bien", "la que quieran los novios", "sorpréndeme", "no sé"). Return isValidTrack: true only when you can extract (or confidently infer) both an artist and a track title.

When isValidTrack is true, return the artist and track name normalized for a Spotify catalog search (fix obvious typos, expand abbreviations, translate nothing). When isValidTrack is false, return null for both artist and track.`;
}

async function resolvePendingSuggestions(wedding: WeddingForSync, metrics: SpotifySyncMetrics): Promise<void> {
  const pending = await prisma.songSuggestion.findMany({
    where: { wedding_id: wedding.id, status: 'PENDING_AI' },
  });

  for (const suggestion of pending) {
    try {
      const { object } = await generateObject({
        model: getChatModel(),
        schema: pendingAiSchema,
        prompt: buildPendingAiPrompt(suggestion.raw_input),
      });

      if (!object.isValidTrack || !object.artist || !object.track) {
        await prisma.songSuggestion.update({ where: { id: suggestion.id }, data: { status: 'DISCARDED' } });
        metrics.discarded++;
        continue;
      }

      const match = await findTrack(object.artist, object.track, wedding.wedding_country);
      if (!match) {
        await prisma.songSuggestion.update({
          where: { id: suggestion.id },
          data: { status: 'FAILED', ai_error: `No Spotify match for "${object.artist} - ${object.track}"` },
        });
        metrics.ai_failed++;
        continue;
      }

      await prisma.songSuggestion.update({
        where: { id: suggestion.id },
        data: {
          status: 'READY',
          spotify_track_id: match.id,
          spotify_uri: match.uri,
          track_title: match.title,
          artist_name: match.artist,
          album_art_url: match.albumArtUrl,
        },
      });
      metrics.processed_ai++;
    } catch (error) {
      console.error(`[SPOTIFY_SYNC] Suggestion ${suggestion.id} failed:`, error);
      metrics.ai_failed++;
      await prisma.songSuggestion
        .update({
          where: { id: suggestion.id },
          data: { status: 'FAILED', ai_error: error instanceof Error ? error.message : String(error) },
        })
        .catch(() => {});
    }
  }
}

// ============================================================================
// Step 2 — playlist creation (with cover) and track sync
// ============================================================================

const PLAYLIST_NAME_PREFIX: Record<string, string> = {
  ES: 'Boda de', EN: 'Wedding of', FR: 'Mariage de', IT: 'Matrimonio di', DE: 'Hochzeit von',
};
const PLAYLIST_DESCRIPTION: Record<string, string> = {
  ES: 'Playlist oficial de la boda, creada por Nupci',
  EN: 'Official wedding playlist, created by Nupci',
  FR: 'Playlist officielle du mariage, créée par Nupci',
  IT: 'Playlist ufficiale del matrimonio, creata da Nupci',
  DE: 'Offizielle Hochzeits-Playlist, erstellt von Nupci',
};

function formatDateForPlaylist(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

/** Downscales the planner's logo into a JPEG base64 string under Spotify's 256KB cover limit. */
async function buildPlaylistCoverBase64(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;

  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());

    let quality = 80;
    let size = 640;
    for (let attempt = 0; attempt < 5; attempt++) {
      const jpeg = await sharp(buffer).resize(size, size, { fit: 'cover' }).jpeg({ quality }).toBuffer();
      const base64 = jpeg.toString('base64');
      if (base64.length <= 256 * 1024) return base64;
      quality -= 15;
      size = Math.round(size * 0.8);
    }
    return null;
  } catch (error) {
    console.error('[SPOTIFY_SYNC] Failed to build playlist cover:', error);
    return null;
  }
}

async function createWeddingPlaylist(wedding: WeddingForSync): Promise<SpotifyPlaylist> {
  const lang = (wedding.default_language || 'EN').toUpperCase();
  const namePrefix = PLAYLIST_NAME_PREFIX[lang] ?? PLAYLIST_NAME_PREFIX.EN;
  const description = PLAYLIST_DESCRIPTION[lang] ?? PLAYLIST_DESCRIPTION.EN;
  const name = `${namePrefix} ${wedding.couple_names} - ${formatDateForPlaylist(wedding.wedding_date)}`.slice(0, 100);

  const playlist = await createPlaylist(name, description);

  const cover = await buildPlaylistCoverBase64(wedding.planner.logo_url);
  if (cover) {
    try {
      await uploadPlaylistCover(playlist.id, cover);
    } catch (error) {
      console.error(`[SPOTIFY_SYNC] Cover upload failed (playlist ${playlist.id}):`, error);
    }
  }

  await prisma.wedding.update({
    where: { id: wedding.id },
    data: { spotify_playlist_id: playlist.id, spotify_playlist_url: playlist.url },
  });

  return playlist;
}

async function syncReadySongs(wedding: WeddingForSync, metrics: SpotifySyncMetrics): Promise<void> {
  const ready = await prisma.songSuggestion.findMany({
    where: { wedding_id: wedding.id, status: 'READY' },
  });
  if (ready.length === 0) return;

  let playlistId = wedding.spotify_playlist_id;
  if (!playlistId) {
    const playlist = await createWeddingPlaylist(wedding);
    playlistId = playlist.id;
    metrics.playlists_created++;
  }

  const existingUris = await getPlaylistTrackUris(playlistId);
  const toAdd = ready.filter((s) => s.spotify_uri && !existingUris.has(s.spotify_uri));

  if (toAdd.length > 0) {
    await addTracksToPlaylist(playlistId, toAdd.map((s) => s.spotify_uri!));
  }

  await prisma.songSuggestion.updateMany({
    where: { id: { in: ready.map((s) => s.id) } },
    data: { status: 'SYNCED', synced_at: new Date() },
  });
  metrics.added_to_playlist += toAdd.length;
}

// ============================================================================
// Entry point
// ============================================================================

export async function processSpotifySync(): Promise<SpotifySyncMetrics> {
  const metrics: SpotifySyncMetrics = {
    weddings_processed: 0,
    processed_ai: 0,
    discarded: 0,
    ai_failed: 0,
    added_to_playlist: 0,
    playlists_created: 0,
    errors: 0,
  };

  if (!isSpotifyConfigured()) return metrics;

  const weddings = await prisma.wedding.findMany({
    where: {
      is_disabled: false,
      deleted_at: null,
      status: 'ACTIVE',
      planner: { spotify_sync_enabled: true },
    },
    select: {
      id: true,
      couple_names: true,
      wedding_date: true,
      wedding_country: true,
      default_language: true,
      spotify_playlist_id: true,
      spotify_playlist_url: true,
      planner: { select: { logo_url: true } },
    },
  });

  for (const wedding of weddings) {
    try {
      await resolvePendingSuggestions(wedding, metrics);
      await syncReadySongs(wedding, metrics);
      metrics.weddings_processed++;
    } catch (error) {
      console.error(`[SPOTIFY_SYNC] Wedding ${wedding.id} failed:`, error);
      metrics.errors++;
    }
  }

  return metrics;
}

// ============================================================================
// Manual trigger — "Probar ahora" in /planner/alert-settings
// ============================================================================

export interface ManualSpotifySyncResult {
  success: boolean;
  reason?: 'wedding_not_found' | 'wedding_inactive' | 'not_configured' | 'sync_not_enabled';
  metrics?: Omit<SpotifySyncMetrics, 'weddings_processed'>;
}

/** Runs the sync for a single wedding immediately, for the manual test-send button. */
export async function triggerManualSpotifySync(weddingId: string): Promise<ManualSpotifySyncResult> {
  if (!isSpotifyConfigured()) return { success: false, reason: 'not_configured' };

  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: {
      id: true,
      couple_names: true,
      wedding_date: true,
      wedding_country: true,
      default_language: true,
      spotify_playlist_id: true,
      spotify_playlist_url: true,
      status: true,
      is_disabled: true,
      planner: { select: { logo_url: true, spotify_sync_enabled: true } },
    },
  });
  if (!wedding) return { success: false, reason: 'wedding_not_found' };
  if (wedding.status !== 'ACTIVE' || wedding.is_disabled) {
    return { success: false, reason: 'wedding_inactive' };
  }
  if (!wedding.planner.spotify_sync_enabled) return { success: false, reason: 'sync_not_enabled' };

  const metrics: SpotifySyncMetrics = {
    weddings_processed: 0,
    processed_ai: 0,
    discarded: 0,
    ai_failed: 0,
    added_to_playlist: 0,
    playlists_created: 0,
    errors: 0,
  };

  await resolvePendingSuggestions(wedding, metrics);
  await syncReadySongs(wedding, metrics);

  return {
    success: true,
    metrics: {
      processed_ai: metrics.processed_ai,
      discarded: metrics.discarded,
      ai_failed: metrics.ai_failed,
      added_to_playlist: metrics.added_to_playlist,
      playlists_created: metrics.playlists_created,
      errors: metrics.errors,
    },
  };
}
