-- AlterTable (wedding layout elements)
ALTER TABLE "weddings" ADD COLUMN "layout_elements" JSONB;

-- AlterTable (family member seat index)
ALTER TABLE "family_members" ADD COLUMN "seat_index" INTEGER;

-- AlterTable (table layout and type)
ALTER TABLE "tables" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'circle';
ALTER TABLE "tables" ADD COLUMN "color" TEXT DEFAULT '#ffffff';
ALTER TABLE "tables" ADD COLUMN "width" DOUBLE PRECISION DEFAULT 80;
ALTER TABLE "tables" ADD COLUMN "height" DOUBLE PRECISION DEFAULT 80;
ALTER TABLE "tables" ADD COLUMN "x" DOUBLE PRECISION;
ALTER TABLE "tables" ADD COLUMN "y" DOUBLE PRECISION;
ALTER TABLE "tables" ADD COLUMN "rotation" DOUBLE PRECISION DEFAULT 0;
