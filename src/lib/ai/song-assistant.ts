/**
 * WhatsApp Song Assistant
 *
 * Lets a guest suggest a song for the wedding's Spotify playlist by chatting
 * with the wedding's WhatsApp number (e.g. "add Bohemian Rhapsody by Queen").
 * Runs as a lightweight classification step ahead of the general FAQ
 * assistant (generateWeddingReply, in ./wedding-assistant.ts) — if the
 * incoming message looks like a song request, it's handled entirely here and
 * the FAQ assistant is skipped for that turn (see the Twilio inbound
 * webhook).
 *
 * Multi-turn clarification ("which song?" -> guest replies "Perfect by Ed
 * Sheeran") is supported by feeding the last few completed WhatsApp turns
 * back into the classification prompt. There's no dedicated chat-history
 * table for the guest channel — turns are reconstructed from TrackingEvent
 * (MESSAGE_RECEIVED rows, which already carry both the guest's message and
 * the reply that was sent for it), the same record the FAQ assistant's
 * conversation is logged to.
 *
 * A cheap keyword pre-filter guards the actual AI classification call
 * (generateObject, one AI_STANDARD unit) so an unrelated FAQ message ("what
 * time is the ceremony?") doesn't cost a second AI call on top of the FAQ
 * assistant's own — see mightBeAboutSongs() / lastTurnWasSongAssistant.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { ResourceType } from '@prisma/client';
import type { Wedding } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getChatModel } from './provider';
import { checkResourceLimit, recordResourceUsage } from '@/lib/license/usage';
import { isSpotifyConfigured, findTrack } from '@/lib/spotify/client';
import { addWhatsappSongSuggestion } from '@/lib/spotify/suggestions';

const HISTORY_TURNS = 4;

const songIntentSchema = z.object({
  isSongRequest: z.boolean(),
  isConfident: z.boolean(),
  artist: z.string().nullable(),
  track: z.string().nullable(),
  clarifyingQuestion: z.string().nullable(),
});

// ============================================================================
// LOCALIZED REPLY TEMPLATES (mirrors the small Record<string,string> pattern
// already used in wedding-assistant.ts for CONTACT_COUPLE_SUFFIX, rather than
// next-intl — these are backend WhatsApp reply strings, not app UI).
// ============================================================================

const CLARIFY_FALLBACK: Record<string, string> = {
  ES: 'Claro, ¿qué canción y de qué artista quieres añadir a la playlist?',
  EN: 'Sure — which song and artist would you like to add to the playlist?',
  FR: 'Bien sûr, quelle chanson et quel artiste souhaitez-vous ajouter à la playlist ?',
  IT: 'Certo, quale canzone e di quale artista vuoi aggiungere alla playlist?',
  DE: 'Klar, welchen Song und welchen Künstler möchtest du zur Playlist hinzufügen?',
};

function notFoundText(lang: string, artist: string, track: string): string {
  const templates: Record<string, string> = {
    ES: `No he encontrado "${track}" de ${artist} en Spotify. ¿Puedes comprobar el título o el artista?`,
    EN: `I couldn't find "${track}" by ${artist} on Spotify. Could you double-check the title or artist?`,
    FR: `Je n'ai pas trouvé "${track}" de ${artist} sur Spotify. Peux-tu vérifier le titre ou l'artiste ?`,
    IT: `Non ho trovato "${track}" di ${artist} su Spotify. Puoi verificare il titolo o l'artista?`,
    DE: `Ich konnte "${track}" von ${artist} nicht auf Spotify finden. Kannst du Titel oder Künstler prüfen?`,
  };
  return templates[lang] ?? templates.EN;
}

function confirmText(lang: string, artist: string, track: string): string {
  const templates: Record<string, string> = {
    ES: `¡Añadida! 🎵 "${track}" de ${artist} a la playlist de la boda.`,
    EN: `Added! 🎵 "${track}" by ${artist} to the wedding playlist.`,
    FR: `Ajoutée ! 🎵 "${track}" de ${artist} à la playlist du mariage.`,
    IT: `Aggiunta! 🎵 "${track}" di ${artist} alla playlist del matrimonio.`,
    DE: `Hinzugefügt! 🎵 "${track}" von ${artist} zur Hochzeits-Playlist.`,
  };
  return templates[lang] ?? templates.EN;
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
  guest: string;
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
      turns.push({ guest: meta.body, assistant: meta.ai_reply });
    }
    if (turns.length >= HISTORY_TURNS) break;
  }
  return { turns: turns.reverse(), lastTurnWasSongAssistant }; // turns: chronological order, oldest first
}

function buildClassificationPrompt(message: string, history: HistoryTurn[]): string {
  const historyText = history
    .map((t) => `Guest: "${t.guest}"\nAssistant: "${t.assistant}"`)
    .join('\n');

  return `You are analyzing a WhatsApp conversation between a wedding's AI assistant and a wedding guest, to detect whether the guest is trying to suggest a song for the wedding's Spotify playlist.

${historyText ? `Recent conversation:\n${historyText}\n\n` : ''}Guest's latest message: "${message}"

Determine:
- isSongRequest: true if the guest is currently trying to add/suggest a song for the playlist — either in this message, or by answering a clarifying question the assistant just asked about a song (check the recent conversation above). False for anything unrelated (RSVP questions, venue questions, small talk, thanks, etc).
- If isSongRequest is true, extract one specific artist and one specific track title using the whole conversation above plus this message (a guest may give the title in one message and the artist in the next). Fix obvious typos; do not invent details that were never given.
- isConfident: true only if you can identify BOTH artist and track with reasonable certainty.
- If isSongRequest is true but isConfident is false, write ONE short, friendly clarifying question, in the guest's own language (matching the language of their message/the conversation), asking specifically for whatever is missing.
- If isSongRequest is false, leave artist, track, and clarifyingQuestion null.`;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export interface SongAssistantResult {
  replyText: string;
}

/**
 * Detects and handles a WhatsApp song-suggestion request. Returns null when
 * the message isn't about adding a song, Spotify isn't configured, or the
 * wedding hasn't enabled song suggestions — the caller should fall through
 * to the general FAQ assistant in that case. On a match, adds a new
 * SongSuggestion (READY, immediately searched against Spotify's catalog —
 * no need to wait for the nightly AI batch since the guest already gave a
 * specific artist/track here) and returns the confirmation reply; if the
 * song is ambiguous or not found on Spotify, returns a clarifying reply
 * instead without writing anything. Unlike the RSVP form's single
 * family-level slot, WhatsApp requests always add a new row, so a family
 * can request several songs over separate messages.
 */
export async function handleSongRequest(params: {
  wedding: Wedding;
  familyId: string;
  message: string;
  language: string;
}): Promise<SongAssistantResult | null> {
  const { wedding, familyId, message, language } = params;
  const lang = language.toUpperCase();

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

  const limitCheck = await checkResourceLimit({
    plannerId: wedding.planner_id,
    weddingId: wedding.id,
    type: ResourceType.AI_STANDARD,
  });
  // Fall through silently on exhausted quota — the general FAQ assistant
  // will hit the same limit right after and reply with the localized
  // "limit reached" message instead.
  if (!limitCheck.allowed) return null;

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
    return null;
  }

  if (!classification.isSongRequest) return null;

  void recordResourceUsage({ plannerId: wedding.planner_id, weddingId: wedding.id, type: ResourceType.AI_STANDARD });

  if (!classification.isConfident || !classification.artist || !classification.track) {
    return { replyText: classification.clarifyingQuestion || CLARIFY_FALLBACK[lang] || CLARIFY_FALLBACK.EN };
  }

  const { artist, track } = classification;
  const match = await findTrack(artist, track, wedding.wedding_country);
  if (!match) {
    return { replyText: notFoundText(lang, artist, track) };
  }

  await addWhatsappSongSuggestion(
    { wedding_id: wedding.id, family_id: familyId, family_member_id: null },
    {
      raw_input: `${artist} - ${track}`,
      spotify_track_id: match.id,
      spotify_uri: match.uri,
      track_title: match.title,
      artist_name: match.artist,
      album_art_url: match.albumArtUrl ?? undefined,
    }
  );

  return { replyText: confirmText(lang, match.artist, match.title) };
}
