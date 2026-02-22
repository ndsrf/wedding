-- Migration: add_wedding_photos_google_photos
-- Adds Google Photos integration fields to the weddings table
-- and creates the wedding_photos table for the per-wedding photo gallery.

-- CreateEnum
CREATE TYPE "PhotoSource" AS ENUM ('WHATSAPP', 'UPLOAD', 'GOOGLE_PHOTOS');

-- AlterTable: add Google Photos fields to weddings
ALTER TABLE "weddings"
  ADD COLUMN "google_photos_album_id"      TEXT,
  ADD COLUMN "google_photos_album_url"     TEXT,
  ADD COLUMN "google_photos_share_url"     TEXT,
  ADD COLUMN "google_photos_refresh_token" TEXT,
  ADD COLUMN "google_photos_access_token"  TEXT,
  ADD COLUMN "google_photos_token_expiry"  TIMESTAMP(3);

-- CreateTable: wedding_photos
CREATE TABLE "wedding_photos" (
  "id"            TEXT NOT NULL,
  "wedding_id"    TEXT NOT NULL,
  "url"           TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "source"        "PhotoSource" NOT NULL DEFAULT 'UPLOAD',
  "sender_name"   TEXT,
  "caption"       TEXT,
  "approved"      BOOLEAN NOT NULL DEFAULT true,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wedding_photos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "wedding_photos"
  ADD CONSTRAINT "wedding_photos_wedding_id_fkey"
  FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "wedding_photos_wedding_id_idx" ON "wedding_photos"("wedding_id");
CREATE INDEX "wedding_photos_wedding_id_approved_idx" ON "wedding_photos"("wedding_id", "approved");
CREATE INDEX "wedding_photos_created_at_idx" ON "wedding_photos"("created_at");
