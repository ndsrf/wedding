-- Data fix: weddings.couple_table_id could be left pointing at a table that
-- was since deleted (the delete-tables flow did not clear it), which made
-- the couple disappear entirely from the seating plan. Clear any such
-- orphaned references so the couple falls back to "unassigned".
UPDATE "weddings"
SET "couple_table_id" = NULL
WHERE "couple_table_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "tables" WHERE "tables"."id" = "weddings"."couple_table_id"
  );
