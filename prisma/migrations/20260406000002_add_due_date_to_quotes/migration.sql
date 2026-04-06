-- Migration: add due_date to quotes and backfill empty due_dates
-- Adds a due_date column to quotes (defaults to 30 days after created_at).
-- Also backfills invoices that have no due_date set.

-- Add due_date column to quotes table
ALTER TABLE "quotes" ADD COLUMN "due_date" TIMESTAMP(3);

-- Backfill quotes: set due_date = created_at + 30 days where currently NULL
UPDATE "quotes"
SET "due_date" = "created_at" + INTERVAL '30 days'
WHERE "due_date" IS NULL;

-- Backfill invoices: set due_date = issued_at (or created_at) + 30 days where currently NULL
UPDATE "invoices"
SET "due_date" = COALESCE("issued_at", "created_at") + INTERVAL '30 days'
WHERE "due_date" IS NULL;
