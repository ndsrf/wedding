-- Migration: fix quote expires_at as the "valid until" date
-- Backfills expires_at for quotes where it is NULL (created_at + 30 days).
-- Drops the due_date column from quotes (it was added in error; quotes use expires_at instead).

-- Backfill expires_at: set to created_at + 30 days where currently NULL
UPDATE "quotes"
SET "expires_at" = "created_at" + INTERVAL '30 days'
WHERE "expires_at" IS NULL;

-- Drop the due_date column that was incorrectly added to quotes
ALTER TABLE "quotes" DROP COLUMN IF EXISTS "due_date";
