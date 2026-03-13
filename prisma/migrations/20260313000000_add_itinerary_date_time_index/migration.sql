-- Add composite index on itinerary_items(wedding_id, date_time) to cover the
-- ORDER BY date_time ASC queries issued by the admin dashboard.  The existing
-- single-column index on wedding_id satisfies the WHERE predicate but leaves
-- PostgreSQL to filesort; this compound index lets it use an index scan for
-- both the filter and the sort in one pass.
CREATE INDEX IF NOT EXISTS "itinerary_items_wedding_id_date_time_idx"
    ON "itinerary_items"("wedding_id", "date_time");
