-- AlterTable: add address to customers
ALTER TABLE "customers" ADD COLUMN "address" TEXT;

-- AlterTable: add client_address to quotes
ALTER TABLE "quotes" ADD COLUMN "client_address" TEXT;

-- AlterTable: add client_address to invoices
ALTER TABLE "invoices" ADD COLUMN "client_address" TEXT;
