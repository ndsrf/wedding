-- CreateTable: Add wedding_country column to weddings table
-- This migration adds a new wedding_country field with default value 'ES' (Spain)

-- Add wedding_country column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'weddings'
    AND column_name = 'wedding_country'
  ) THEN
    ALTER TABLE "weddings" ADD COLUMN "wedding_country" TEXT NOT NULL DEFAULT 'ES';
  END IF;
END $$;
