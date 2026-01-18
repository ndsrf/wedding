-- Add RSVP configuration fields to weddings table

-- Transportation question
ALTER TABLE "weddings" ADD COLUMN "transportation_question_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "weddings" ADD COLUMN "transportation_question_text" TEXT;

-- Dietary restrictions
ALTER TABLE "weddings" ADD COLUMN "dietary_restrictions_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Extra Yes/No questions (up to 3)
ALTER TABLE "weddings" ADD COLUMN "extra_question_1_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "weddings" ADD COLUMN "extra_question_1_text" TEXT;
ALTER TABLE "weddings" ADD COLUMN "extra_question_2_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "weddings" ADD COLUMN "extra_question_2_text" TEXT;
ALTER TABLE "weddings" ADD COLUMN "extra_question_3_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "weddings" ADD COLUMN "extra_question_3_text" TEXT;

-- Extra mandatory info fields (up to 3)
ALTER TABLE "weddings" ADD COLUMN "extra_info_1_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "weddings" ADD COLUMN "extra_info_1_label" TEXT;
ALTER TABLE "weddings" ADD COLUMN "extra_info_2_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "weddings" ADD COLUMN "extra_info_2_label" TEXT;
ALTER TABLE "weddings" ADD COLUMN "extra_info_3_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "weddings" ADD COLUMN "extra_info_3_label" TEXT;
