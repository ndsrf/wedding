-- Add image_url column to tasting_scores
ALTER TABLE "tasting_scores" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
