-- Adds the COUPLE value to SongSource — the wedding admin (the couple)
-- adding a song themselves by chatting with NupciBot (web widget or their
-- own WhatsApp), never tied to a guest family. These rows have family_id
-- NULL and are created via addSongSuggestionFromChat, same as WHATSAPP
-- ones; no index changes are needed since the family-scope partial unique
-- index from migration 20260821090000 only constrains source = 'RSVP' rows.

ALTER TYPE "SongSource" ADD VALUE 'COUPLE';
