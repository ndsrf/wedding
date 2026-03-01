-- Migration: Add indexes to optimise the unread-notifications query
-- Used by the 2-minute poller (NotificationBell) and the notifications page.
--
-- 1. Compound index on tracking_events(wedding_id, timestamp DESC)
--    Speeds up the main list query which filters by wedding_id and orders
--    by timestamp descending.
--
-- 2. Compound covering index on notifications(tracking_event_id, read)
--    Turns the NOT EXISTS / none-{read:true} sub-query into a single
--    index seek instead of a heap scan.

CREATE INDEX IF NOT EXISTS "tracking_events_wedding_id_timestamp_idx"
  ON "tracking_events" ("wedding_id", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS "notifications_tracking_event_id_read_idx"
  ON "notifications" ("tracking_event_id", "read");
