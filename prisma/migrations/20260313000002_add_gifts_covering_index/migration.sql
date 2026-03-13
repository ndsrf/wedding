-- Covering index for COUNT(DISTINCT family_id) on gifts filtered by wedding_id + status.
-- Allows the admin dashboard payment-received stat to be resolved via an index-only scan
-- without touching the heap, replacing the previous correlated EXISTS / findMany+distinct patterns.
CREATE INDEX IF NOT EXISTS "gifts_wedding_id_status_family_id_idx"
  ON "gifts" ("wedding_id", "status", "family_id");
