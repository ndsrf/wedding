-- AlterTable
ALTER TABLE "weddings" ADD COLUMN "wedding_day_theme_id" TEXT;

-- CreateIndex
CREATE INDEX "weddings_wedding_day_theme_id_idx" ON "weddings"("wedding_day_theme_id");

-- AddForeignKey
ALTER TABLE "weddings" ADD CONSTRAINT "weddings_wedding_day_theme_id_fkey" FOREIGN KEY ("wedding_day_theme_id") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
