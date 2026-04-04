-- Add versioning fields to quotes table
ALTER TABLE "quotes" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "quotes" ADD COLUMN "previous_version_id" TEXT;

-- Add unique constraint on previous_version_id (each quote can only be superseded once)
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_previous_version_id_key" UNIQUE ("previous_version_id");

-- Add self-referential foreign key
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
