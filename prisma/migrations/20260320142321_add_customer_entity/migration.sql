-- CreateTable: customers
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "planner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_planner_id_idx" ON "customers"("planner_id");
CREATE INDEX "customers_planner_id_name_idx" ON "customers"("planner_id", "name");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add customer_id to weddings
ALTER TABLE "weddings" ADD COLUMN "customer_id" TEXT;
CREATE INDEX "weddings_customer_id_idx" ON "weddings"("customer_id");
ALTER TABLE "weddings" ADD CONSTRAINT "weddings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add customer_id to quotes
ALTER TABLE "quotes" ADD COLUMN "customer_id" TEXT;
CREATE INDEX "quotes_customer_id_idx" ON "quotes"("customer_id");
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop unique constraint on contracts.quote_id (allow multiple contracts per quote)
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_quote_id_key";

-- Add customer_id to contracts
ALTER TABLE "contracts" ADD COLUMN "customer_id" TEXT;
CREATE INDEX "contracts_customer_id_idx" ON "contracts"("customer_id");
CREATE INDEX "contracts_quote_id_idx" ON "contracts"("quote_id");
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add customer_id to invoices
ALTER TABLE "invoices" ADD COLUMN "customer_id" TEXT;
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
