-- Add composite index on (planner_id, status, wedding_date) to speed up
-- planner dashboard queries that filter by planner + status and sort/filter by date.
CREATE INDEX IF NOT EXISTS "weddings_planner_id_status_wedding_date_idx" ON "weddings"("planner_id", "status", "wedding_date");
