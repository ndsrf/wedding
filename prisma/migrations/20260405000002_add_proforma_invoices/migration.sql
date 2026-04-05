-- Create InvoiceType enum (PROFORMA, INVOICE=Ordinaria, RECTIFICATIVA)
CREATE TYPE "InvoiceType" AS ENUM ('PROFORMA', 'INVOICE', 'RECTIFICATIVA');

-- Add new columns to invoices table
ALTER TABLE "invoices" ADD COLUMN "type" "InvoiceType" NOT NULL DEFAULT 'INVOICE';
ALTER TABLE "invoices" ADD COLUMN "contract_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN "proforma_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN "serie" TEXT;
ALTER TABLE "invoices" ADD COLUMN "numero" INTEGER;
ALTER TABLE "invoices" ADD COLUMN "chain_hash" TEXT;

-- Add unique constraint on proforma_id (each proforma can only generate one invoice)
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_proforma_id_key" UNIQUE ("proforma_id");

-- Drop the existing global unique constraint on invoice_number and replace with per-planner constraint
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_invoice_number_key";
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_planner_id_invoice_number_key" UNIQUE ("planner_id", "invoice_number");

-- Add unique constraint on (planner_id, serie, numero) to ensure no duplicate numbering within a planner's series
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_planner_id_serie_numero_key" UNIQUE ("planner_id", "serie", "numero");

-- Add foreign key to contracts
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add self-referential foreign key (proforma_id references the proforma invoice)
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_proforma_id_fkey" FOREIGN KEY ("proforma_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index on contract_id for faster lookups
CREATE INDEX "invoices_contract_id_idx" ON "invoices"("contract_id");
