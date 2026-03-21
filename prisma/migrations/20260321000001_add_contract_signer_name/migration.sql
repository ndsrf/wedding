-- AlterTable: add signer_name to contracts for DocuSeal integration
ALTER TABLE "contracts" ADD COLUMN "signer_name" TEXT;
