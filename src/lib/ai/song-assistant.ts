/**
 * Chat Song Assistant
 *
 * Lets someone suggest a song for the wedding's Spotify playlist by
 * chatting — either a guest over the wedding's WhatsApp number (e.g. "add
 * Bohemian Rhapsody by Queen"), or the wedding admin (the couple)
 * themselves via NupciBot (web widget or their own WhatsApp). Runs as a
 * lightweight classification step ahead of the general reply assistant
 * (generateWeddingReply for guests, generateNupciBotReply/RAG for the
 * couple) — if the incoming message looks like a song request, it's
 * handled entirely here and the other assistant is skipped for that turn
 * (see the Twilio inbound webhook and the NupciBot chat routes).
 *
 * The two entry points below (handleSongRequest for guests,
 * handleCoupleSongRequest for the couple) share the same classification
 * core (classifySongMessage) and DB write (addSongSuggestionFromChat in
 * suggestions.ts) — they only differ in their gating condition, where
 * conversation history comes from, and the resulting suggestion's scope
 * (family_id set vs null) and source (WHATSAPP vs COUPLE).
 *
 * Multi-turn clarification ("which song?" -> reply "Perfect by Ed Sheeran")
 * is supported by feeding the last few completed turns back into the
 * classification prompt. For guests there's no dedicated chat-history
 * table — turns are reconstructed from TrackingEvent (MESSAGE_RECEIVED
 * rows, which already carry both the guest's message and the reply sent
 * for it), the same record the FAQ assistant's conversation is logged to.
 * For the couple, the caller supplies real chat history too — either the
 * browser's in-memory NupciBot widget state, or a short-lived Redis-backed
 * store for their own WhatsApp (see admin-chat-history.ts, since
 * TrackingEvent can't be reused for admin messages).
 *
 * A cheap keyword pre-filter guards the actual AI classification call
 * (generateObject, one AI_STANDARD unit) so an unrelated message ("what
 * time is the ceremony?") doesn't cost a second AI call on top of the other
 * assistant's own — see mightBeAboutSongs().
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { ResourceType } from '@prisma/client';
import type { Wedding } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getChatModel } from './provider';
import { checkResourceLimit, recordResourceUsage } from '@/lib/license/usage';
import { isSpotifyConfigured, findTrack, type SpotifyTrack } from '@/lib/spotify/client';
import { addSongSuggestionFromChat } from '@/lib/spotify/suggestions';
import { t as translate } from '@/lib/i18n/server';
import type { Language } from '@/lib/i18n/config';

const HISTORY_TURNS = 4;

const songIntentSchema = z.object({
  isSongRequest: z.boolean(),
  isConfident: z.boolean(),
  artist: z.string().nullable(),
  track: z.string().nullable(),
  clarifyingQuestion: z.string().nullable(),
});

// ============================================================================
// LOCALIZED REPLY TEMPLATES — sourced from src/messages/*/common.json under
// the "songAssistant" key (same t() helper used for backend-generated
// strings elsewhere, e.g. formatLimitError in license/usage.ts), rather than
// next-intl — these are backend WhatsApp reply strings, not app UI.
// ============================================================================

function clarifyFallbackText(lang: string): Promise<string> {
  return translate('songAssistant.clarifyFallback', lang.toLowerCase() as Language);
}

function notFoundText(lang: string, artist: string, track: string): Promise<string> {
  return translate('songAssistant.notFound', lang.toLowerCase() as Language, { artist, track });
}

function confirmText(lang: string, artist: string, track: string): Promise<string> {
  return translate('songAssistant.confirm', lang.toLowerCase() as Language, { artist, track });
}

// ============================================================================
// CHEAP PRE-FILTER — avoids spending an AI_STANDARD call classifying every
// single WhatsApp message (most are unrelated FAQ questions). Only messages
// that either mention something song-like, or are continuing a
// clarification the song assistant itself just asked, reach generateObject.
// ============================================================================

const SONG_KEYWORDS = [
  'song', 'playlist', 'spotify', 'track', 'tune',
  'canción', 'cancion', 'canciones', 'tema', 'música', 'musica',
  'chanson', 'morceau', 'musique',
  'canzone', 'canzoni', 'brano',
  'lied', 'musik',
];

function mightBeAboutSongs(message: string): boolean {
  const lower = message.toLowerCase();
  return SONG_KEYWORDS.some((kw) => lower.includes(kw));
}

// ============================================================================
// CONVERSATION HISTORY (reconstructed from TrackingEvent)
// ============================================================================

interface HistoryTurn {
  user: string;
  assistant: string;
}

interface RecentContext {
  turns: HistoryTurn[];
  /** Whether the most recent completed turn's reply came from this assistant (e.g. a clarifying question). */
  lastTurnWasSongAssistant: boolean;
}

async function getRecentContext(familyId: string): Promise<RecentContext> {
  const events = await prisma.trackingEvent.findMany({
    where: { family_id: familyId, event_type: 'MESSAGE_RECEIVED' },
    orderBy: { timestamp: 'desc' },
    // A couple extra in case the just-created current-turn row (no ai_reply
    // yet) is included — it's filtered out below by the ai_reply check.
    take: HISTORY_TURNS + 2,
    select: { metadata: true },
  });

  const turns: HistoryTurn[] = [];
  let lastTurnWasSongAssistant = false;
  let sawFirstCompletedTurn = false;

  for (const event of events) {
    const meta = event.metadata as { body?: string; ai_reply?: string; assistant_source?: string } | null;
    if (meta?.body && meta?.ai_reply) {
      if (!sawFirstCompletedTurn) {
        lastTurnWasSongAssistant = meta.assistant_source === 'song';
        sawFirstCompletedTurn = true;
      }
      turns.push({ user: meta.body, assistant: meta.ai_reply });
    }
    if (turns.length >= HISTORY_TURNS) break;
  }
  return { turns: turns.reverse(), lastTurnWasSongAssistant }; // turns: chronological order, oldest first
}

// Converts the couple's chat widget history (plain {role, content} turns,
// as supplied by the NupciBot chat routes) into the same HistoryTurn shape
// used above, so both entry points share buildClassificationPrompt/
// classifySongMessage below. Consecutive user->assistant pairs become one
// turn; anything that doesn't pair up (e.g. two user messages in a row) is
// skipped rather than guessed at.
function chatHistoryToTurns(history: Array<{ role: 'user' | 'assistant'; content: string }>): HistoryTurn[] {
  const turns: HistoryTurn[] = [];
  let i = 0;
  while (i < history.length - 1) {
    if (history[i].role === 'user' && history[i + 1].role === 'assistant') {
      turns.push({ user: history[i].content, assistant: history[i + 1].content });
      i += 2;
    } else {
      i += 1;
    }
  }
  return turns.slice(-HISTORY_TURNS);
}

function buildClassificationPrompt(message: string, history: HistoryTurn[]): string {
  const historyText = history
    .map((t) => `User: "${t.user}"\nAssistant: "${t.assistant}"`)
    .join('\n');

  return `You are analyzing a conversation between a wedding's AI assistant and either a wedding guest or the wedding couple themselves, to detect whether the user is trying to suggest a song for the wedding's Spotify playlist.

${historyText ? `Recent conversation:\n${historyText}\n\n` : ''}User's latest message: "${message}"

Determine:
- isSongRequest: true if the user is currently trying to add/suggest a song for the playlist — either in this message, or by answering a clarifying question the assistant just asked about a song (check the recent conversation above). False for anything unrelated (RSVP questions, venue questions, platform/admin questions, small talk, thanks, etc).
- If isSongRequest is true, extract one specific artist and one specific track title using the whole conversation above plus this message (the user may give the title in one message and the artist in the next). Fix obvious typos; do not invent details that were never given.
- isConfident: true only if you can identify BOTH artist and track with reasonable certainty.
- If isSongRequest is true but isConfident is false, write ONE short, friendly clarifying question, in the user's own language (matching the language of their message/the conversation), asking specifically for whatever is missing.
- If isSongRequest is false, leave artist, track, and clarifyingQuestion null.`;
}

// ============================================================================
// SHARED CLASSIFICATION CORE
// ============================================================================

export interface SongAssistantResult {
  replyText: string;
}

type SongClassification =
  | { kind: 'not_song' }
  | { kind: 'clarify'; replyText: string }
  | { kind: 'not_found'; replyText: string }
  | { kind: 'resolved'; replyText: string; artist: string; track: string; match: SpotifyTrack };

/**
 * Runs the AI classification (does this message ask for a song? which
 * one?) and, once confident, the Spotify catalog search — shared by both
 * handleSongRequest (guests) and handleCoupleSongRequest (the wedding
 * admin). Does not write to the database; callers decide the resulting
 * SongSuggestion's scope/source once they get a 'resolved' classification.
 * Records AI_STANDARD usage itself on a successful classification call
 * (regardless of the resulting kind), same as before this was split out.
 */
async function classifySongMessage(params: {
  wedding: Wedding;
  message: string;
  history: HistoryTurn[];
  language: string;
}): Promise<SongClassification> {
  const { wedding, message, history, language } = params;

  const limitCheck = await checkResourceLimit({
    plannerId: wedding.planner_id,
    weddingId: wedding.id,
    type: ResourceType.AI_STANDARD,
  });
  // Fall through silently on exhausted quota — the general assistant will
  // hit the same limit right after and reply with the localized "limit
  // reached" message instead.
  if (!limitCheck.allowed) return { kind: 'not_song' };

  let classification: z.infer<typeof songIntentSchema>;
  try {
    const { object } = await generateObject({
      model: getChatModel(),
      schema: songIntentSchema,
      prompt: buildClassificationPrompt(message, history),
    });
    classification = object;
  } catch (error) {
    console.error('[SONG_ASSISTANT] Classification failed:', error);
    return { kind: 'not_song' };
  }

  if (!classification.isSongRequest) return { kind: 'not_song' };

  void recordResourceUsage({ plannerId: wedding.planner_id, weddingId: wedding.id, type: ResourceType.AI_STANDARD });

  if (!classification.isConfident || !classification.artist || !classification.track) {
    return {
      kind: 'clarify',
      replyText: classification.clarifyingQuestion || (await clarifyFallbackText(language)),
    };
  }

  const { artist, track } = classification;
  const match = await findTrack(artist, track, wedding.wedding_country);
  if (!match) {
    return { kind: 'not_found', replyText: await notFoundText(language, artist, track) };
  }

  return { kind: 'resolved', replyText: await confirmText(language, match.artist, match.title), artist, track, match };
}

function songSuggestionInput(classification: Extract<SongClassification, { kind: 'resolved' }>) {
  const { artist, track, match } = classification;
  return {
    raw_input: `${artist} - ${track}`,
    spotify_track_id: match.id,
    spotify_uri: match.uri,
    track_title: match.title,
    artist_name: match.artist,
    album_art_url: match.albumArtUrl ?? undefined,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Detects and handles a WhatsApp song-suggestion request from a guest.
 * Returns null when the message isn't about adding a song, Spotify isn't
 * configured, or the wedding hasn't enabled song suggestions — the caller
 * should fall through to the general FAQ assistant in that case. On a
 * match, adds a new SongSuggestion (READY, immediately searched against
 * Spotify's catalog — no need to wait for the nightly AI batch since the
 * guest already gave a specific artist/track here) and returns the
 * confirmation reply; if the song is ambiguous or not found on Spotify,
 * returns a clarifying reply instead without writing anything. Unlike the
 * RSVP form's single family-level slot, WhatsApp requests always add a new
 * row, so a family can request several songs over separate messages.
 */
export async function handleSongRequest(params: {
  wedding: Wedding;
  familyId: string;
  message: string;
  language: string;
}): Promise<SongAssistantResult | null> {
  const { wedding, familyId, message, language } = params;

  // WhatsApp only resolves to a Family, never a specific guest (FamilyMember
  // has no phone number of its own) — so suggestions are always added at the
  // family level, same scope as the RSVP form's family-level song question.
  if (!wedding.song_question_family_enabled && !wedding.song_question_individual_enabled) return null;
  if (!isSpotifyConfigured()) return null;

  // Reconstruct short history first (cheap, one indexed query) — it doubles
  // as the pre-filter signal: skip the AI classification call entirely for
  // the common case of an unrelated FAQ message, unless it's continuing a
  // clarification this assistant itself just asked.
  const { turns: history, lastTurnWasSongAssistant } = await getRecentContext(familyId);
  if (!lastTurnWasSongAssistant && !mightBeAboutSongs(message)) return null;

  const classification = await classifySongMessage({ wedding, message, history, language });
  if (classification.kind === 'not_song') return null;
  if (classification.kind !== 'resolved') return { replyText: classification.replyText };

  await addSongSuggestionFromChat(
    { wedding_id: wedding.id, family_id: familyId, family_member_id: null },
    songSuggestionInput(classification),
    'WHATSAPP'
  );

  return { replyText: classification.replyText };
}

/**
 * Detects and handles a song-suggestion request from the wedding admin
 * (the couple) themselves, chatting with NupciBot — either the web widget
 * or their own WhatsApp number. Either way the caller supplies real recent
 * chat history (the widget's in-memory state, or Redis-backed short-term
 * history for WhatsApp — see admin-chat-history.ts), so multi-turn
 * clarification works the same as it does for guests. Returns null when
 * the message isn't about adding a song or Spotify isn't configured, so
 * the caller falls through to NupciBot's normal reply generation. Unlike
 * handleSongRequest, this isn't gated on the wedding's guest-facing
 * song_question_*_enabled toggles —
 * the couple can add songs to their own playlist regardless of whether
 * they've turned that question on for guests. Suggestions are stored with
 * source COUPLE and no family_id, so they never collide with a guest's.
 */
export async function handleCoupleSongRequest(params: {
  wedding: Wedding;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  language: string;
}): Promise<SongAssistantResult | null> {
  const { wedding, message, history: rawHistory, language } = params;

  if (!isSpotifyConfigured()) return null;

  const history = chatHistoryToTurns(rawHistory);
  // No persisted "did we just ask a clarifying question" flag like the
  // guest path has (TrackingEvent isn't used for admin chat) — approximate
  // it by checking whether the assistant's last reply also looked
  // song-related, so a one-word follow-up ("Coldplay") still triggers
  // classification.
  const lastAssistantReply = [...rawHistory].reverse().find((m) => m.role === 'assistant')?.content;
  if (!mightBeAboutSongs(message) && !(lastAssistantReply && mightBeAboutSongs(lastAssistantReply))) return null;

  const classification = await classifySongMessage({ wedding, message, history, language });
  if (classification.kind === 'not_song') return null;
  if (classification.kind !== 'resolved') return { replyText: classification.replyText };

  await addSongSuggestionFromChat(
    { wedding_id: wedding.id, family_id: null, family_member_id: null },
    songSuggestionInput(classification),
    'COUPLE'
  );

  return { replyText: classification.replyText };
}
