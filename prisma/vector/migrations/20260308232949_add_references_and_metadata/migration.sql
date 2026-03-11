-- AlterEnum
ALTER TYPE "DocType" ADD VALUE 'REFERENCES';

-- AlterTable
ALTER TABLE "document_chunks" ADD COLUMN     "fullUrl" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "weddingProviderId" TEXT;
