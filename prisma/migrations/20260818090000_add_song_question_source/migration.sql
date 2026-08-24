-- AlterTable: weddings — let each wedding reuse an existing generic text
-- field (instead of the dedicated Spotify search widget) as the source for
-- family-level / individual-level song suggestions.
ALTER TABLE "weddings" ADD COLUMN "song_question_family_source" TEXT;
ALTER TABLE "weddings" ADD COLUMN "song_question_individual_source" TEXT;
