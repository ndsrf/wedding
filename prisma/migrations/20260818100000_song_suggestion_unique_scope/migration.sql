-- Prevents duplicate SongSuggestion rows for the same family-level or
-- individual-level scope (e.g. from a double-submitted RSVP or a client
-- retry racing the findFirst-then-create upsert in lib/spotify/suggestions.ts).
-- Two partial indexes are needed because a plain unique index treats each
-- NULL family_member_id as distinct, so a single (wedding_id, family_id,
-- family_member_id) constraint would not actually catch duplicate
-- family-level rows.
CREATE UNIQUE INDEX "song_suggestions_family_scope_key"
  ON "song_suggestions" ("wedding_id", "family_id")
  WHERE "family_member_id" IS NULL;

CREATE UNIQUE INDEX "song_suggestions_member_scope_key"
  ON "song_suggestions" ("wedding_id", "family_member_id")
  WHERE "family_member_id" IS NOT NULL;
