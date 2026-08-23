/**
 * Spotify playlist nightly sync
 *
 * Runs once a day (via the cron job registry) across every wedding whose
 * planner has `spotify_sync_enabled`:
 *   0. Harvests song suggestions from a reused generic field, per wedding
 *      (weddings configured for that instead of the dedicated widget).
 *   1. Resolves PENDING_AI song suggestions (free text typed by guests)
 *      into a real Spotify track via an LLM extraction step + catalog
 *      search — batched up to BATCH_SIZE suggestions per LLM call
 *      *across all weddings*, not one call per suggestion. Suggestions
 *      belonging to a planner whose AI_STANDARD quota (PlannerLicense.
 *      max_standard_ai_calls) is reached — including a limit of 0 — are
 *      skipped entirely; no AI call is made for their weddings (see
 *      filterAllowedByAiQuota). This applies to both this nightly job and
 *      the manual triggerManualSpotifySync().
 *   2. Adds all READY suggestions to each wedding's Spotify playlist,
 *      creating the playlist (with cover) on first use. Not gated by AI
 *      quota — no LLM call is involved in this step.
 *
 * Sends no notifications — metrics are only logged by the cron runner.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import sharp from 'sharp';
import { ResourceType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getChatModel } from '@/lib/ai/provider';
import { checkResourceLimit, recordResourceUsage } from '@/lib/license/usage';
import { syncSongSuggestionFromText } from './suggestions';
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
// Step 0 — sync suggestions from a reused generic field (optional)
// ============================================================================

const FAMILY_SOURCES = ['extra_info_1', 'extra_info_2', 'extra_info_3'] as const;
const INDIVIDUAL_SOURCES = ['guest_text_question_1', 'guest_text_question_2', 'guest_text_question_3'] as const;

type SongSourceFamily = 'spotify' | (typeof FAMILY_SOURCES)[number];
type SongSourceIndividual = 'spotify' | (typeof INDIVIDUAL_SOURCES)[number];

function normalizeFamilySource(value: string | null): SongSourceFamily {
  return (FAMILY_SOURCES as readonly string[]).includes(value ?? '') ? (value as SongSourceFamily) : 'spotify';
}

function normalizeIndividualSource(value: string | null): SongSourceIndividual {
  return (INDIVIDUAL_SOURCES as readonly string[]).includes(value ?? '') ? (value as SongSourceIndividual) : 'spotify';
}

/**
 * For weddings configured to reuse a generic family text field (instead of
 * the dedicated Spotify search widget), copies each family's current answer
 * for that field into a PENDING_AI song suggestion before AI resolution runs.
 */
async function syncFamilyMappedSuggestions(weddingId: string, source: SongSourceFamily): Promise<void> {
  if (source === 'spotify') return;

  const families = await prisma.family.findMany({
    where: { wedding_id: weddingId },
    select: { id: true, extra_info_1_value: true, extra_info_2_value: true, extra_info_3_value: true },
  });

  for (const family of families) {
    const text = source === 'extra_info_1' ? family.extra_info_1_value
      : source === 'extra_info_2' ? family.extra_info_2_value
      : family.extra_info_3_value;
    await syncSongSuggestionFromText(
      { wedding_id: weddingId, family_id: family.id, family_member_id: null },
      text
    );
  }
}

/**
 * Same as above, for a generic per-guest text field reused as the
 * individual song question source.
 */
async function syncIndividualMappedSuggestions(weddingId: string, source: SongSourceIndividual): Promise<void> {
  if (source === 'spotify') return;

  const members = await prisma.familyMember.findMany({
    where: { family: { wedding_id: weddingId }, attending: true },
    select: {
      id: true,
      family_id: true,
      guest_text_question_1_answer: true,
      guest_text_question_2_answer: true,
      guest_text_question_3_answer: true,
    },
  });

  for (const member of members) {
    const text = source === 'guest_text_question_1' ? member.guest_text_question_1_answer
      : source === 'guest_text_question_2' ? member.guest_text_question_2_answer
      : member.guest_text_question_3_answer;
    await syncSongSuggestionFromText(
      { wedding_id: weddingId, family_id: member.family_id, family_member_id: member.id },
      text
    );
  }
}

// ============================================================================
// Step 1 — resolve PENDING_AI suggestions
//
// Batched: one LLM call per BATCH_SIZE suggestions rather than one per
// suggestion — callers pass in every eligible suggestion across every
// wedding they're processing (the cron entry point below batches across
// ALL weddings in a single run; the manual per-wedding trigger batches
// across just that wedding's suggestions).
// ============================================================================

const BATCH_SIZE = 50;

const pendingAiBatchSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      isValidTrack: z.boolean(),
      artist: z.string().nullable(),
      track: z.string().nullable(),
    })
  ),
});

interface PendingSuggestion {
  id: string;
  wedding_id: string;
  raw_input: string;
}

function buildBatchPrompt(items: PendingSuggestion[]): string {
  const list = items.map((it) => `- [id="${it.id}"] "${it.raw_input}"`).join('\n');
  return `Wedding guests were each asked to suggest a song for their wedding's playlist. Below is a list of their answers (possibly in Spanish, English, French, Italian, German, or another language), each tagged with an id:

${list}

For EACH item, determine whether the text identifies a specific, real song. Mark isValidTrack: false if the text is a joke, a non-answer, or too vague to identify one specific song (e.g. "cualquiera está bien", "la que quieran los novios", "sorpréndeme", "no sé"). Mark isValidTrack: true only when you can extract (or confidently infer) both an artist and a track title.

When isValidTrack is true, return the artist and track name normalized for a Spotify catalog search (fix obvious typos, expand abbreviations, translate nothing). When isValidTrack is false, return null for both artist and track.

Return exactly one result per item listed above, each carrying its original id unchanged.`;
}

async function applyPendingAiResult(
  suggestionId: string,
  result: { isValidTrack: boolean; artist: string | null; track: string | null },
  market: string,
  metrics: SpotifySyncMetrics
): Promise<void> {
  if (!result.isValidTrack || !result.artist || !result.track) {
    await prisma.songSuggestion.update({ where: { id: suggestionId }, data: { status: 'DISCARDED' } });
    metrics.discarded++;
    return;
  }

  const match = await findTrack(result.artist, result.track, market);
  if (!match) {
    await prisma.songSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'FAILED', ai_error: `No Spotify match for "${result.artist} - ${result.track}"` },
    });
    metrics.ai_failed++;
    return;
  }

  await prisma.songSuggestion.update({
    where: { id: suggestionId },
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
}

/**
 * Filters out suggestions belonging to a planner whose AI_STANDARD monthly
 * quota (PlannerLicense.max_standard_ai_calls) is already reached —
 * including a planner with the limit set to 0, which blocks AI resolution
 * for all of their weddings entirely. Applies to both the nightly batch
 * job and the manual "Probar ahora"/"Actualizar playlist" triggers: no AI
 * call is made for a wedding whose planner is over quota.
 *
 * Checked once per planner per run (not per-suggestion, not re-checked as
 * usage accrues within the run) — the same check-before-call pattern every
 * other AI call site in the app uses (see src/lib/license/usage.ts).
 * Skipped suggestions are left untouched (still PENDING_AI) so they're
 * picked up automatically once the planner's quota resets or is raised.
 */
async function filterAllowedByAiQuota(
  suggestions: PendingSuggestion[],
  plannerIdFor: (weddingId: string) => string | null
): Promise<PendingSuggestion[]> {
  const allowedByPlannerId = new Map<string, boolean>();
  const allowed: PendingSuggestion[] = [];

  for (const suggestion of suggestions) {
    const plannerId = plannerIdFor(suggestion.wedding_id);
    if (!plannerId) continue;

    if (!allowedByPlannerId.has(plannerId)) {
      const result = await checkResourceLimit({ plannerId, type: ResourceType.AI_STANDARD });
      allowedByPlannerId.set(plannerId, result.allowed);
      if (!result.allowed) {
        console.log(
          `[SPOTIFY_SYNC] Skipping AI resolution for planner ${plannerId}: AI_STANDARD quota reached (${result.used ?? 0}/${result.limit ?? 0}).`
        );
      }
    }

    if (allowedByPlannerId.get(plannerId)) allowed.push(suggestion);
  }

  return allowed;
}

/**
 * Resolves every given PENDING_AI suggestion, batching up to BATCH_SIZE per
 * LLM call regardless of which wedding each one belongs to. `marketFor`
 * resolves the right Spotify catalog market per suggestion for the search
 * step, since that part is still necessarily per-suggestion. `plannerIdFor`
 * attributes AI_STANDARD usage back to each suggestion's planner — callers
 * are expected to have already filtered the list via
 * `filterAllowedByAiQuota`, so every suggestion reaching this function is
 * cleared to make an AI call.
 */
async function resolvePendingSuggestionsBatch(
  suggestions: PendingSuggestion[],
  marketFor: (weddingId: string) => string,
  plannerIdFor: (weddingId: string) => string | null,
  metrics: SpotifySyncMetrics
): Promise<void> {
  for (let i = 0; i < suggestions.length; i += BATCH_SIZE) {
    const chunk = suggestions.slice(i, i + BATCH_SIZE);

    try {
      const { object } = await generateObject({
        model: getChatModel(),
        schema: pendingAiBatchSchema,
        prompt: buildBatchPrompt(chunk),
      });

      // The AI call was made for the whole chunk regardless of each item's
      // outcome below, so record usage for every suggestion in it now.
      for (const suggestion of chunk) {
        const plannerId = plannerIdFor(suggestion.wedding_id);
        if (plannerId) {
          await recordResourceUsage({ plannerId, weddingId: suggestion.wedding_id, type: ResourceType.AI_STANDARD });
        }
      }

      const resultsById = new Map(object.results.map((r) => [r.id, r]));

      for (const suggestion of chunk) {
        const result = resultsById.get(suggestion.id);
        if (!result) {
          metrics.ai_failed++;
          await prisma.songSuggestion
            .update({
              where: { id: suggestion.id },
              data: { status: 'FAILED', ai_error: 'AI batch response did not include this suggestion' },
            })
            .catch(() => {});
          continue;
        }
        await applyPendingAiResult(suggestion.id, result, marketFor(suggestion.wedding_id), metrics);
      }
    } catch (error) {
      console.error(`[SPOTIFY_SYNC] Batch AI resolution failed (${chunk.length} suggestions):`, error);
      const message = error instanceof Error ? error.message : String(error);
      for (const suggestion of chunk) {
        metrics.ai_failed++;
        await prisma.songSuggestion
          .update({ where: { id: suggestion.id }, data: { status: 'FAILED', ai_error: message } })
          .catch(() => {});
      }
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

  // A READY row without a spotify_uri is a data anomaly (READY is only ever
  // set alongside a resolved uri) — excluded from both the playlist add and
  // the SYNCED update below, so it's left as READY for inspection/retry
  // instead of being silently marked as delivered when nothing was added.
  const validReady = ready.filter((s) => s.spotify_uri);

  const existingUris = await getPlaylistTrackUris(playlistId);
  const toAdd = validReady.filter((s) => !existingUris.has(s.spotify_uri!));

  if (toAdd.length > 0) {
    await addTracksToPlaylist(playlistId, toAdd.map((s) => s.spotify_uri!));
  }

  if (validReady.length > 0) {
    await prisma.songSuggestion.updateMany({
      where: { id: { in: validReady.map((s) => s.id) } },
      data: { status: 'SYNCED', synced_at: new Date() },
    });
  }
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
      planner_id: true,
      couple_names: true,
      wedding_date: true,
      wedding_country: true,
      default_language: true,
      spotify_playlist_id: true,
      spotify_playlist_url: true,
      song_question_family_enabled: true,
      song_question_family_source: true,
      song_question_individual_enabled: true,
      song_question_individual_source: true,
      planner: { select: { logo_url: true } },
    },
  });

  // Step 0: harvest suggestions from reused generic fields, per wedding (needs
  // that wedding's family/member rows) — cheap, no LLM/API calls involved.
  for (const wedding of weddings) {
    try {
      const familySource = wedding.song_question_family_enabled ? normalizeFamilySource(wedding.song_question_family_source) : 'spotify';
      const individualSource = wedding.song_question_individual_enabled ? normalizeIndividualSource(wedding.song_question_individual_source) : 'spotify';
      await syncFamilyMappedSuggestions(wedding.id, familySource);
      await syncIndividualMappedSuggestions(wedding.id, individualSource);
    } catch (error) {
      console.error(`[SPOTIFY_SYNC] Wedding ${wedding.id} field harvest failed:`, error);
      metrics.errors++;
    }
  }

  // Step 1: resolve every wedding's PENDING_AI suggestions together, in as
  // few LLM calls as possible (see resolvePendingSuggestionsBatch) — after
  // dropping suggestions whose planner is over their AI_STANDARD quota.
  const marketByWedding = new Map(weddings.map((w) => [w.id, w.wedding_country]));
  const plannerIdByWedding = new Map(weddings.map((w) => [w.id, w.planner_id]));
  const plannerIdFor = (weddingId: string) => plannerIdByWedding.get(weddingId) ?? null;
  const pending = await prisma.songSuggestion.findMany({
    where: { wedding_id: { in: weddings.map((w) => w.id) }, status: 'PENDING_AI' },
    select: { id: true, wedding_id: true, raw_input: true },
  });
  const allowedPending = await filterAllowedByAiQuota(pending, plannerIdFor);
  await resolvePendingSuggestionsBatch(allowedPending, (weddingId) => marketByWedding.get(weddingId) ?? 'ES', plannerIdFor, metrics);

  // Step 2: sync each wedding's now-READY suggestions into its own playlist.
  for (const wedding of weddings) {
    try {
      await syncReadySongs(wedding, metrics);
      metrics.weddings_processed++;
    } catch (error) {
      console.error(`[SPOTIFY_SYNC] Wedding ${wedding.id} playlist sync failed:`, error);
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
      planner_id: true,
      couple_names: true,
      wedding_date: true,
      wedding_country: true,
      default_language: true,
      spotify_playlist_id: true,
      spotify_playlist_url: true,
      status: true,
      is_disabled: true,
      song_question_family_enabled: true,
      song_question_family_source: true,
      song_question_individual_enabled: true,
      song_question_individual_source: true,
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

  const familySource = wedding.song_question_family_enabled ? normalizeFamilySource(wedding.song_question_family_source) : 'spotify';
  const individualSource = wedding.song_question_individual_enabled ? normalizeIndividualSource(wedding.song_question_individual_source) : 'spotify';
  await syncFamilyMappedSuggestions(wedding.id, familySource);
  await syncIndividualMappedSuggestions(wedding.id, individualSource);

  const pending = await prisma.songSuggestion.findMany({
    where: { wedding_id: wedding.id, status: 'PENDING_AI' },
    select: { id: true, wedding_id: true, raw_input: true },
  });
  const allowedPending = await filterAllowedByAiQuota(pending, () => wedding.planner_id);
  await resolvePendingSuggestionsBatch(allowedPending, () => wedding.wedding_country, () => wedding.planner_id, metrics);

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
