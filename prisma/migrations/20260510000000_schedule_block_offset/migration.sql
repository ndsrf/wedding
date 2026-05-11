-- Add optional offset_minutes to schedule_blocks
-- When set, the block starts at (wedding start + offset_minutes) instead of after the previous block.
-- This allows parallel / overlapping sections.
ALTER TABLE "schedule_blocks" ADD COLUMN "offset_minutes" INTEGER;
