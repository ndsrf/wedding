-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsAppMode') THEN
        CREATE TYPE "WhatsAppMode" AS ENUM ('BUSINESS', 'LINKS');
    END IF;
END
$$;

-- AlterTable
ALTER TABLE "weddings" ADD COLUMN IF NOT EXISTS "whatsapp_mode" "WhatsAppMode" NOT NULL DEFAULT 'BUSINESS';
