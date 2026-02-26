-- Migration: Remove Google Photos OAuth fields
-- The Google Photos Library API was shut down on March 31 2025.
-- OAuth tokens, album IDs, and album URLs are no longer useful.
-- Only google_photos_share_url is kept so admins can paste a link manually.

ALTER TABLE "weddings"
  DROP COLUMN IF EXISTS "google_photos_album_id",
  DROP COLUMN IF EXISTS "google_photos_album_url",
  DROP COLUMN IF EXISTS "google_photos_refresh_token",
  DROP COLUMN IF EXISTS "google_photos_access_token",
  DROP COLUMN IF EXISTS "google_photos_token_expiry";
