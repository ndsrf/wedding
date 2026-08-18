/**
 * Song suggestion upsert helpers (Spotify integration)
 *
 * Shared between the guest RSVP submit endpoint (a picked track or free
 * text, submitted directly by the guest) and the nightly sync job (plain
 * text read from a generic RSVP field, for weddings configured to reuse
 * one instead of the dedicated Spotify search widget).
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { SongSuggestionInput } from '@/types/api';

export interface SongSuggestionScope {
  wedding_id: string;
  family_id: string;
  family_member_id: string | null;
}

/**
 * Creates a SongSuggestion row, tolerating a concurrent create for the same
 * scope (e.g. a double-submitted RSVP) — the DB enforces one row per scope
 * via partial unique indexes (see migration 20260818100000), so a losing
 * concurrent create raises P2002; that request just updates the winner's
 * row instead of erroring.
 */
async function createOrRecoverFromRace(
  scope: SongSuggestionScope,
  data: Omit<Prisma.SongSuggestionUncheckedCreateInput, keyof SongSuggestionScope>
): Promise<void> {
  try {
    await prisma.songSuggestion.create({ data: { ...scope, ...data } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.songSuggestion.findFirst({ where: scope });
      if (existing) await prisma.songSuggestion.update({ where: { id: existing.id }, data });
      return;
    }
    throw error;
  }
}

/**
 * Upserts (or clears) a song suggestion from a full input — a picked track
 * (with Spotify metadata, stored READY) or free text (stored PENDING_AI).
 * `undefined` means "not part of this submission" (leave untouched); an
 * empty/missing `raw_input` clears a previously saved suggestion.
 */
export async function upsertSongSuggestion(
  scope: SongSuggestionScope,
  input: SongSuggestionInput | null | undefined
): Promise<void> {
  if (input === undefined) return;

  const existing = await prisma.songSuggestion.findFirst({ where: scope });

  if (!input || !input.raw_input?.trim()) {
    if (existing) await prisma.songSuggestion.delete({ where: { id: existing.id } });
    return;
  }

  const data = {
    raw_input: input.raw_input.trim(),
    spotify_track_id: input.spotify_track_id ?? null,
    spotify_uri: input.spotify_uri ?? null,
    track_title: input.track_title ?? null,
    artist_name: input.artist_name ?? null,
    album_art_url: input.album_art_url ?? null,
    status: input.spotify_uri ? ('READY' as const) : ('PENDING_AI' as const),
  };

  if (existing) {
    await prisma.songSuggestion.update({ where: { id: existing.id }, data });
  } else {
    await createOrRecoverFromRace(scope, data);
  }
}

/**
 * Syncs a song suggestion's raw_input from a plain text field's current
 * value — used by the nightly job for weddings configured to reuse a
 * generic RSVP text field instead of the dedicated Spotify search widget.
 *
 * Only touches rows whose text actually changed since the last run,
 * resetting them to PENDING_AI for re-resolution; unchanged, already
 * resolved suggestions are left alone so the job doesn't burn AI/Spotify
 * calls re-processing the same text every night. Empty/missing text is a
 * no-op (doesn't delete a previously resolved suggestion).
 */
export async function syncSongSuggestionFromText(
  scope: SongSuggestionScope,
  rawText: string | null | undefined
): Promise<void> {
  const trimmed = rawText?.trim();
  if (!trimmed) return;

  const existing = await prisma.songSuggestion.findFirst({ where: scope });

  if (existing) {
    if (existing.raw_input === trimmed) return;
    await prisma.songSuggestion.update({
      where: { id: existing.id },
      data: {
        raw_input: trimmed,
        status: 'PENDING_AI',
        spotify_track_id: null,
        spotify_uri: null,
        track_title: null,
        artist_name: null,
        album_art_url: null,
        ai_error: null,
        synced_at: null,
      },
    });
    return;
  }

  await createOrRecoverFromRace(scope, { raw_input: trimmed, status: 'PENDING_AI' });
}
