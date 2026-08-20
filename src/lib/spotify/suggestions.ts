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
import { findTrack } from './client';
import type { SongSuggestionInput, SongSuggestionListItem } from '@/types/api';

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

function formatWho(family: { name: string } | null, familyMember: { name: string } | null): string {
  if (!familyMember) return family?.name ?? '';
  return family?.name ? `${family.name} — ${familyMember.name}` : familyMember.name;
}

function toListItem(row: {
  id: string;
  raw_input: string;
  track_title: string | null;
  artist_name: string | null;
  status: SongSuggestionListItem['status'];
  ai_error: string | null;
  created_at: Date;
  family: { name: string } | null;
  family_member: { name: string } | null;
}): SongSuggestionListItem {
  return {
    id: row.id,
    who: formatWho(row.family, row.family_member),
    raw_input: row.raw_input,
    track_title: row.track_title,
    artist_name: row.artist_name,
    status: row.status,
    ai_error: row.ai_error,
    created_at: row.created_at.toISOString(),
  };
}

/**
 * Lists every song suggestion for a wedding, newest first — backs the
 * read-only "Abrir listado" debug view on the Spotify Playlist gallery card
 * (what each guest/family entered, the resolved track, status, and any
 * ai_error, so a planner/admin can see why a song didn't reach the playlist).
 */
export async function listSongSuggestions(weddingId: string): Promise<SongSuggestionListItem[]> {
  const rows = await prisma.songSuggestion.findMany({
    where: { wedding_id: weddingId },
    orderBy: { created_at: 'desc' },
    include: {
      family: { select: { name: true } },
      family_member: { select: { name: true } },
    },
  });

  return rows.map(toListItem);
}

function describeQuery(artistName: string | null, trackTitle: string | null): string {
  if (artistName && trackTitle) return `"${artistName} - ${trackTitle}"`;
  if (artistName) return `artist "${artistName}"`;
  return `track "${trackTitle}"`;
}

/**
 * Re-searches Spotify's catalog with an admin-corrected artist/track pair
 * (e.g. fixing a typo the AI extraction step got wrong) and updates the
 * suggestion immediately — bypassing the AI step entirely, since the admin
 * has already supplied clean values. Either value can be null/empty — an
 * artist alone returns their top track, a track alone searches by title —
 * but not both. Returns null if the suggestion doesn't belong to the given
 * wedding.
 */
export async function retrySongSuggestion(
  id: string,
  weddingId: string,
  artistName: string | null,
  trackTitle: string | null
): Promise<SongSuggestionListItem | null> {
  const suggestion = await prisma.songSuggestion.findFirst({
    where: { id, wedding_id: weddingId },
    include: {
      wedding: { select: { wedding_country: true } },
      family: { select: { name: true } },
      family_member: { select: { name: true } },
    },
  });
  if (!suggestion) return null;

  const match = await findTrack(artistName, trackTitle, suggestion.wedding.wedding_country);

  const updated = await prisma.songSuggestion.update({
    where: { id },
    data: match
      ? {
          status: 'READY',
          spotify_track_id: match.id,
          spotify_uri: match.uri,
          track_title: match.title,
          artist_name: match.artist,
          album_art_url: match.albumArtUrl,
          ai_error: null,
        }
      : {
          status: 'FAILED',
          track_title: trackTitle,
          artist_name: artistName,
          spotify_track_id: null,
          spotify_uri: null,
          album_art_url: null,
          ai_error: `No Spotify match for ${describeQuery(artistName, trackTitle)}`,
        },
  });

  return toListItem({ ...updated, family: suggestion.family, family_member: suggestion.family_member });
}

/**
 * Marks a suggestion DISCARDED without touching Spotify — for songs an
 * admin/planner simply doesn't want on the playlist. Returns null if the
 * suggestion doesn't belong to the given wedding.
 */
export async function discardSongSuggestion(id: string, weddingId: string): Promise<SongSuggestionListItem | null> {
  const suggestion = await prisma.songSuggestion.findFirst({
    where: { id, wedding_id: weddingId },
    include: {
      family: { select: { name: true } },
      family_member: { select: { name: true } },
    },
  });
  if (!suggestion) return null;

  const updated = await prisma.songSuggestion.update({
    where: { id },
    data: { status: 'DISCARDED', ai_error: null },
  });

  return toListItem({ ...updated, family: suggestion.family, family_member: suggestion.family_member });
}

/**
 * Adds a blank, unscoped (no family/guest) song suggestion row — for songs a
 * planner/admin heard about off-band (e.g. a guest who mentioned several
 * songs in one RSVP text field, or a request that came in by phone) and
 * wants added to the playlist by hand from the "Abrir listado" modal.
 * `placeholderRawInput` is only ever shown back in the "Lo que escribió"
 * column until the admin fills in artist/track and retries — it plays no
 * role in resolution.
 */
export async function createManualSongSuggestion(
  weddingId: string,
  placeholderRawInput: string
): Promise<SongSuggestionListItem> {
  const created = await prisma.songSuggestion.create({
    data: { wedding_id: weddingId, family_id: null, family_member_id: null, raw_input: placeholderRawInput, status: 'PENDING_AI' },
  });
  return toListItem({ ...created, family: null, family_member: null });
}

/** Deletes a song suggestion, e.g. a manually-added row created by mistake. */
export async function deleteSongSuggestion(id: string, weddingId: string): Promise<boolean> {
  const { count } = await prisma.songSuggestion.deleteMany({ where: { id, wedding_id: weddingId } });
  return count > 0;
}
