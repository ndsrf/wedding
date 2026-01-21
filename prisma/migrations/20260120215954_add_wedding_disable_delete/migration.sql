-- AlterEnum
ALTER TYPE "WeddingStatus" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "weddings" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "disabled_at" TIMESTAMP(3),
ADD COLUMN     "disabled_by" TEXT,
ADD COLUMN     "is_disabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "weddings_is_disabled_idx" ON "weddings"("is_disabled");

-- CreateIndex
CREATE INDEX "weddings_status_is_disabled_idx" ON "weddings"("status", "is_disabled");
