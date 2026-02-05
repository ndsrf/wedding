-- AddField
ALTER TABLE "weddings" ADD COLUMN "short_url_initials" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "weddings_short_url_initials_key" ON "weddings"("short_url_initials");

-- AddField
ALTER TABLE "families" ADD COLUMN "short_url_code" TEXT;

-- CreateIndex (composite unique; PostgreSQL allows multiple NULLs in unique indexes)
CREATE UNIQUE INDEX "families_wedding_id_short_url_code_key" ON "families"("wedding_id", "short_url_code");
