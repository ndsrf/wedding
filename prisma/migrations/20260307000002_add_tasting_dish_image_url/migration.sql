-- Add image_url column to tasting_dishes (idempotent)
ALTER TABLE "tasting_dishes" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
