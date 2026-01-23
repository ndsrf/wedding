-- AlterTable (seating feature)
ALTER TABLE "family_members" ADD COLUMN "seating_group" TEXT,
ADD COLUMN "table_id" TEXT;

-- AlterTable (seating feature)
ALTER TABLE "weddings" ADD COLUMN "couple_table_id" TEXT;

-- CreateTable (seating feature)
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "name" TEXT,
    "number" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tables_wedding_id_idx" ON "tables"("wedding_id");

-- CreateIndex
CREATE UNIQUE INDEX "tables_wedding_id_number_key" ON "tables"("wedding_id", "number");

-- CreateIndex
CREATE INDEX "family_members_table_id_idx" ON "family_members"("table_id");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
