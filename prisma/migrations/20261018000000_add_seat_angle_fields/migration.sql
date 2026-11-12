-- AlterTable (custom guest position around the table, degrees 0-360; NULL = auto-arranged)
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "seat_angle" DOUBLE PRECISION;

-- AlterTable (custom seat position for the couple's own two synthetic seats)
ALTER TABLE "weddings"
  ADD COLUMN IF NOT EXISTS "couple_member_1_seat_angle" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "couple_member_2_seat_angle" DOUBLE PRECISION;
