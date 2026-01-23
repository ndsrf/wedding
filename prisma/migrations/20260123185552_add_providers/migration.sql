-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'PAYPAL', 'BIZUM', 'REVOLUT', 'OTHER');

-- AlterTable
ALTER TABLE "checklist_tasks" ALTER COLUMN "section_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "provider_categories" (
    "id" TEXT NOT NULL,
    "planner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "planner_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "social_media" TEXT,
    "approx_price" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_providers" (
    "id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "provider_id" TEXT,
    "total_price" DECIMAL(10,2),
    "contract_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "wedding_provider_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_categories_planner_id_idx" ON "provider_categories"("planner_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_categories_planner_id_name_key" ON "provider_categories"("planner_id", "name");

-- CreateIndex
CREATE INDEX "providers_planner_id_idx" ON "providers"("planner_id");

-- CreateIndex
CREATE INDEX "providers_category_id_idx" ON "providers"("category_id");

-- CreateIndex
CREATE INDEX "wedding_providers_wedding_id_idx" ON "wedding_providers"("wedding_id");

-- CreateIndex
CREATE INDEX "wedding_providers_category_id_idx" ON "wedding_providers"("category_id");

-- CreateIndex
CREATE INDEX "wedding_providers_provider_id_idx" ON "wedding_providers"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_providers_wedding_id_category_id_provider_id_key" ON "wedding_providers"("wedding_id", "category_id", "provider_id");

-- CreateIndex
CREATE INDEX "payments_wedding_provider_id_idx" ON "payments"("wedding_provider_id");

-- AddForeignKey
ALTER TABLE "provider_categories" ADD CONSTRAINT "provider_categories_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "provider_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_providers" ADD CONSTRAINT "wedding_providers_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_providers" ADD CONSTRAINT "wedding_providers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "provider_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_providers" ADD CONSTRAINT "wedding_providers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_wedding_provider_id_fkey" FOREIGN KEY ("wedding_provider_id") REFERENCES "wedding_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

