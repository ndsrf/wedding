-- Add pdf_url to contracts table
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "pdf_url" TEXT;

-- Add discount to invoices table
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(10,2);
