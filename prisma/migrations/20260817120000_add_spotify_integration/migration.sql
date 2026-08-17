-- CreateEnum
CREATE TYPE "SongStatus" AS ENUM ('READY', 'PENDING_AI', 'SYNCED', 'DISCARDED', 'FAILED');

-- AlterTable: weddings — song suggestion questions + playlist reference
ALTER TABLE "weddings" ADD COLUMN "song_question_family_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "weddings" ADD COLUMN "song_question_family_text" JSONB;
ALTER TABLE "weddings" ADD COLUMN "song_question_individual_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "weddings" ADD COLUMN "song_question_individual_text" JSONB;
ALTER TABLE "weddings" ADD COLUMN "spotify_playlist_id" TEXT;
ALTER TABLE "weddings" ADD COLUMN "spotify_playlist_url" TEXT;

-- AlterTable: wedding_planners — global toggle for the nightly Spotify sync job
ALTER TABLE "wedding_planners" ADD COLUMN "spotify_sync_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "song_suggestions" (
    "id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "family_id" TEXT,
    "family_member_id" TEXT,
    "raw_input" TEXT NOT NULL,
    "spotify_track_id" TEXT,
    "spotify_uri" TEXT,
    "track_title" TEXT,
    "artist_name" TEXT,
    "album_art_url" TEXT,
    "status" "SongStatus" NOT NULL DEFAULT 'PENDING_AI',
    "ai_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "song_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "song_suggestions_wedding_id_idx" ON "song_suggestions"("wedding_id");

-- CreateIndex
CREATE INDEX "song_suggestions_wedding_id_status_idx" ON "song_suggestions"("wedding_id", "status");

-- CreateIndex
CREATE INDEX "song_suggestions_family_id_idx" ON "song_suggestions"("family_id");

-- CreateIndex
CREATE INDEX "song_suggestions_family_member_id_idx" ON "song_suggestions"("family_member_id");

-- AddForeignKey
ALTER TABLE "song_suggestions" ADD CONSTRAINT "song_suggestions_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_suggestions" ADD CONSTRAINT "song_suggestions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_suggestions" ADD CONSTRAINT "song_suggestions_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
