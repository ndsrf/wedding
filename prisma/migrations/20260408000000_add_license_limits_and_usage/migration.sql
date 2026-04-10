-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('WHATSAPP', 'AI_STANDARD', 'AI_PREMIUM');

-- AlterTable
ALTER TABLE "planner_licenses" ADD COLUMN "can_delete_weddings" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "planner_licenses" ADD COLUMN "max_premium_ai_calls" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "planner_licenses" ADD COLUMN "max_standard_ai_calls" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "planner_licenses" ADD COLUMN "max_whatsapp_per_month" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "planner_licenses" ADD COLUMN "max_whatsapp_per_wedding_per_month" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "resource_usages" (
    "id" TEXT NOT NULL,
    "planner_id" TEXT NOT NULL,
    "wedding_id" TEXT,
    "type" "ResourceType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resource_usages_planner_id_idx" ON "resource_usages"("planner_id");
CREATE INDEX "resource_usages_wedding_id_idx" ON "resource_usages"("wedding_id");
CREATE INDEX "resource_usages_type_idx" ON "resource_usages"("type");
CREATE INDEX "resource_usages_timestamp_idx" ON "resource_usages"("timestamp");

-- AddForeignKey
ALTER TABLE "resource_usages" ADD CONSTRAINT "resource_usages_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resource_usages" ADD CONSTRAINT "resource_usages_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
