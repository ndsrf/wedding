-- Add language preference to tasting participants
ALTER TABLE "tasting_participants" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'ES';
