-- CreateEnum
CREATE TYPE "WhatsAppMode" AS ENUM ('BUSINESS', 'LINKS');

-- AlterTable
ALTER TABLE "weddings" ADD COLUMN "whatsapp_mode" "WhatsAppMode" NOT NULL DEFAULT 'BUSINESS';
