-- CreateEnum
CREATE TYPE "TastingMenuStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "tasting_menus" ADD COLUMN "tasting_date" TIMESTAMP(3),
ADD COLUMN "status" "TastingMenuStatus" NOT NULL DEFAULT 'CLOSED';
