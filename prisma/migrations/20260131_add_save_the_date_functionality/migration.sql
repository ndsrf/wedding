-- AlterEnum
-- Add SAVE_THE_DATE to TemplateType enum
-- Note: Since we need SAVE_THE_DATE to be first in the enum order,
-- we need to recreate the enum with the new order
DO $$
BEGIN
    -- Check if SAVE_THE_DATE already exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SAVE_THE_DATE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TemplateType')) THEN
        -- Check if old type exists (cleanup from partial migration)
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TemplateType_old') THEN
            DROP TYPE "TemplateType_old";
        END IF;

        ALTER TYPE "TemplateType" RENAME TO "TemplateType_old";
        CREATE TYPE "TemplateType" AS ENUM ('SAVE_THE_DATE', 'INVITATION', 'REMINDER', 'CONFIRMATION');
        ALTER TABLE "message_templates" ALTER COLUMN "type" TYPE "TemplateType" USING "type"::text::"TemplateType";
        DROP TYPE "TemplateType_old";
    END IF;
END $$;

-- AlterEnum
-- Add SAVE_THE_DATE_SENT to EventType enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SAVE_THE_DATE_SENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'SAVE_THE_DATE_SENT';
    END IF;
END $$;

-- AlterTable
-- Add save_the_date_enabled to weddings table
ALTER TABLE "weddings" ADD COLUMN IF NOT EXISTS "save_the_date_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
-- Add save_the_date_sent to families table
ALTER TABLE "families" ADD COLUMN IF NOT EXISTS "save_the_date_sent" TIMESTAMP(3);
