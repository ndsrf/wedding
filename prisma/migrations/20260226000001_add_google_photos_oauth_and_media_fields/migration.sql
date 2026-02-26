-- Migration: Add Google Photos OAuth fields and media item tracking
-- Re-adds OAuth token fields to weddings (now using appendonly + readonly.appcreateddata
-- scopes, since the deprecated sharing scope has been removed).
-- Adds google_photos_media_id and url_expires_at to wedding_photos to enable
-- lazy URL refresh (Google Photos baseUrls expire after ~60 minutes).

ALTER TABLE "weddings"
  ADD COLUMN IF NOT EXISTS "google_photos_album_id"     TEXT,
  ADD COLUMN IF NOT EXISTS "google_photos_access_token" TEXT,
  ADD COLUMN IF NOT EXISTS "google_photos_refresh_token" TEXT,
  ADD COLUMN IF NOT EXISTS "google_photos_token_expiry" TIMESTAMPTZ;

ALTER TABLE "wedding_photos"
  ADD COLUMN IF NOT EXISTS "google_photos_media_id" TEXT,
  ADD COLUMN IF NOT EXISTS "url_expires_at"          TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "wedding_photos_google_photos_media_id_idx"
  ON "wedding_photos" ("google_photos_media_id");
