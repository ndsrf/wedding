-- Adds a `source` column to song_suggestions (RSVP vs WHATSAPP) so a guest
-- can add multiple songs per family over WhatsApp, while the RSVP form
-- keeps its existing "one family-level suggestion, replaced on resubmit"
-- behavior.
--
-- The family-scope partial unique index from migration
-- 20260818100000_song_suggestion_unique_scope enforced one row per
-- (wedding_id, family_id) regardless of provenance. It's replaced here with
-- a narrower version that only applies to source = 'RSVP' rows, so
-- WhatsApp-sourced rows (still family_id set, family_member_id NULL) can
-- coexist without limit. The per-guest index is untouched — WhatsApp never
-- resolves to a specific FamilyMember, so it's unaffected.

CREATE TYPE "SongSource" AS ENUM ('RSVP', 'WHATSAPP');

ALTER TABLE "song_suggestions" ADD COLUMN "source" "SongSource" NOT NULL DEFAULT 'RSVP';

DROP INDEX "song_suggestions_family_scope_key";

CREATE UNIQUE INDEX "song_suggestions_family_scope_key"
  ON "song_suggestions" ("wedding_id", "family_id")
  WHERE "family_member_id" IS NULL AND "source" = 'RSVP';
