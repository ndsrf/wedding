-- AlterTable: add round_number column with default 1 (existing rows become round 1)
ALTER TABLE "tasting_menus" ADD COLUMN "round_number" INTEGER NOT NULL DEFAULT 1;

-- DropIndex: remove old unique constraint on wedding_id alone
DROP INDEX "tasting_menus_wedding_id_key";

-- CreateIndex: new unique constraint on (wedding_id, round_number)
CREATE UNIQUE INDEX "tasting_menus_wedding_id_round_number_key" ON "tasting_menus"("wedding_id", "round_number");
