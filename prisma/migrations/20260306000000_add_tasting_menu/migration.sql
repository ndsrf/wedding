-- Migration: add_tasting_menu
-- Adds tasting menu experience: menus, sections, dishes, participants, and scores.
-- Also extends TemplateType enum with TASTING_MENU.

-- Extend TemplateType enum
ALTER TYPE "TemplateType" ADD VALUE IF NOT EXISTS 'TASTING_MENU';

-- TastingMenu (one per wedding)
CREATE TABLE "tasting_menus" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "wedding_id"  TEXT        NOT NULL,
  "title"       TEXT        NOT NULL DEFAULT 'Tasting Menu',
  "description" TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasting_menus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tasting_menus_wedding_id_key" ON "tasting_menus"("wedding_id");
CREATE INDEX "tasting_menus_wedding_id_idx" ON "tasting_menus"("wedding_id");

ALTER TABLE "tasting_menus"
  ADD CONSTRAINT "tasting_menus_wedding_id_fkey"
  FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TastingSection
CREATE TABLE "tasting_sections" (
  "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "menu_id"    TEXT         NOT NULL,
  "name"       TEXT         NOT NULL,
  "order"      INTEGER      NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasting_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tasting_sections_menu_id_idx" ON "tasting_sections"("menu_id");
CREATE INDEX "tasting_sections_menu_id_order_idx" ON "tasting_sections"("menu_id", "order");

ALTER TABLE "tasting_sections"
  ADD CONSTRAINT "tasting_sections_menu_id_fkey"
  FOREIGN KEY ("menu_id") REFERENCES "tasting_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TastingDish
CREATE TABLE "tasting_dishes" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "section_id"  TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "description" TEXT,
  "order"       INTEGER      NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasting_dishes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tasting_dishes_section_id_idx" ON "tasting_dishes"("section_id");
CREATE INDEX "tasting_dishes_section_id_order_idx" ON "tasting_dishes"("section_id", "order");

ALTER TABLE "tasting_dishes"
  ADD CONSTRAINT "tasting_dishes_section_id_fkey"
  FOREIGN KEY ("section_id") REFERENCES "tasting_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TastingParticipant
CREATE TABLE "tasting_participants" (
  "id"                 TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "menu_id"            TEXT         NOT NULL,
  "name"               TEXT         NOT NULL,
  "email"              TEXT,
  "phone"              TEXT,
  "whatsapp_number"    TEXT,
  "channel_preference" "Channel",
  "magic_token"        TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "invite_sent_at"     TIMESTAMP(3),
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasting_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tasting_participants_magic_token_key" ON "tasting_participants"("magic_token");
CREATE INDEX "tasting_participants_menu_id_idx" ON "tasting_participants"("menu_id");
CREATE INDEX "tasting_participants_magic_token_idx" ON "tasting_participants"("magic_token");

ALTER TABLE "tasting_participants"
  ADD CONSTRAINT "tasting_participants_menu_id_fkey"
  FOREIGN KEY ("menu_id") REFERENCES "tasting_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TastingScore
CREATE TABLE "tasting_scores" (
  "id"             TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "participant_id" TEXT         NOT NULL,
  "dish_id"        TEXT         NOT NULL,
  "score"          INTEGER      NOT NULL,
  "notes"          TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasting_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tasting_scores_participant_id_dish_id_key" ON "tasting_scores"("participant_id", "dish_id");
CREATE INDEX "tasting_scores_dish_id_idx" ON "tasting_scores"("dish_id");
CREATE INDEX "tasting_scores_participant_id_idx" ON "tasting_scores"("participant_id");

ALTER TABLE "tasting_scores"
  ADD CONSTRAINT "tasting_scores_participant_id_fkey"
  FOREIGN KEY ("participant_id") REFERENCES "tasting_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tasting_scores"
  ADD CONSTRAINT "tasting_scores_dish_id_fkey"
  FOREIGN KEY ("dish_id") REFERENCES "tasting_dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
