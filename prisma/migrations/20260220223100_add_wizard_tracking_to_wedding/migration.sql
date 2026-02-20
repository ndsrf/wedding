-- AlterTable
ALTER TABLE "weddings" ADD COLUMN "wizard_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "wizard_current_step" INTEGER,
ADD COLUMN "wizard_completed_at" TIMESTAMP(3),
ADD COLUMN "wizard_skipped" BOOLEAN NOT NULL DEFAULT false;
