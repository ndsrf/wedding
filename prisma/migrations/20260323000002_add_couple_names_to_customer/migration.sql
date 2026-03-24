-- Add couple_names to customers.
-- This stores the formatted "Person A & Person B" wedding-style name
-- separately from the canonical customer name, so it can be pre-populated
-- when creating a wedding from a contract.

ALTER TABLE "customers" ADD COLUMN "couple_names" TEXT;

-- Backfill: for customers whose name looks like a couple (contains " & " or " y "),
-- copy it into couple_names. This covers customers migrated from quotes in the
-- previous migration whose name IS the couple_names string.
UPDATE "customers"
SET couple_names = name
WHERE name ILIKE '%&%'
   OR name ILIKE '% y %';
