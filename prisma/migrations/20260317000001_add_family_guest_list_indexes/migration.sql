-- Composite indexes on the families table to speed up filtered guest-list queries.
--
-- 1. (wedding_id, name) — supports the default ORDER BY name ASC after the
--    WHERE wedding_id = ? filter with an index-only scan, removing the sort
--    step entirely.
--
-- 2. (wedding_id, channel_preference) — used when the guest list is filtered
--    by ?channel=WHATSAPP|EMAIL|SMS. Without this, Postgres scans the full
--    wedding_id partition and applies the channel filter in memory.
--
-- 3. (wedding_id, invited_by_admin_id) — used when the guest list is filtered
--    by ?invited_by_admin_id=<uuid>. Avoids a full wedding partition scan for
--    what is typically a small subset of families.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "families_wedding_id_name_idx"
  ON "families" ("wedding_id", "name");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "families_wedding_id_channel_preference_idx"
  ON "families" ("wedding_id", "channel_preference");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "families_wedding_id_invited_by_admin_id_idx"
  ON "families" ("wedding_id", "invited_by_admin_id");
