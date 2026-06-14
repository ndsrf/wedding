-- Add accessibility_needs_enabled flag to weddings table
ALTER TABLE "weddings" ADD COLUMN IF NOT EXISTS "accessibility_needs_enabled" BOOLEAN NOT NULL DEFAULT false;
