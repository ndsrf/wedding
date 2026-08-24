/**
 * Short-term chat history for the wedding admin's own WhatsApp conversation
 * with NupciBot.
 *
 * Unlike guests (whose conversation is reconstructed from TrackingEvent —
 * see getRecentContext in song-assistant.ts), admin WhatsApp messages were
 * never persisted anywhere, so every turn looked like a fresh, disconnected
 * message: asking "which song?" and getting "Bohemian Rhapsody by Queen" in
 * reply had no way to be linked back to the original request. TrackingEvent
 * can't be reused here without a wider schema change (its family_id column
 * is required, and an admin message isn't tied to a family), so this uses a
 * short-lived Redis-backed store instead — enough to carry a clarification
 * round-trip, not a permanent transcript.
 */

import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import type { ChatMessage } from './nupcibot';

const MAX_TURNS = 6;

/** Returns the admin's recent WhatsApp turns with NupciBot, oldest first. Empty if none/expired/Redis unavailable. */
export async function getAdminWhatsappHistory(adminId: string): Promise<ChatMessage[]> {
  return (await getCached<ChatMessage[]>(CACHE_KEYS.adminWhatsappChat(adminId))) ?? [];
}

/** Appends one user+assistant turn, capped to the last MAX_TURNS*2 messages, refreshing the TTL. */
export async function appendAdminWhatsappTurn(adminId: string, userMessage: string, assistantReply: string): Promise<void> {
  const history = await getAdminWhatsappHistory(adminId);
  history.push({ role: 'user', content: userMessage }, { role: 'assistant', content: assistantReply });
  await setCached(CACHE_KEYS.adminWhatsappChat(adminId), history.slice(-MAX_TURNS * 2), CACHE_TTL.ADMIN_WHATSAPP_CHAT);
}
