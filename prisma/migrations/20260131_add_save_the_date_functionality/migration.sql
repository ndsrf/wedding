-- AlterEnum
-- Add SAVE_THE_DATE to TemplateType enum
-- Note: Since we need SAVE_THE_DATE to be first in the enum order,
-- we need to recreate the enum with the new order
ALTER TYPE "TemplateType" RENAME TO "TemplateType_old";

CREATE TYPE "TemplateType" AS ENUM ('SAVE_THE_DATE', 'INVITATION', 'REMINDER', 'CONFIRMATION');

ALTER TABLE "message_templates" ALTER COLUMN "type" TYPE "TemplateType" USING "type"::text::"TemplateType";

DROP TYPE "TemplateType_old";

-- AlterEnum
-- Add SAVE_THE_DATE_SENT to EventType enum
ALTER TYPE "EventType" ADD VALUE 'SAVE_THE_DATE_SENT';

-- AlterTable
-- Add save_the_date_enabled to weddings table
ALTER TABLE "weddings" ADD COLUMN "save_the_date_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
-- Add save_the_date_sent to families table
ALTER TABLE "families" ADD COLUMN "save_the_date_sent" TIMESTAMP(3);
