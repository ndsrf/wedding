-- AlterTable
ALTER TABLE "locations" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';
