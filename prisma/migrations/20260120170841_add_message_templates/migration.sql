-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('INVITATION', 'REMINDER');

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'INVITATION_SENT';

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "language" "Language" NOT NULL,
    "channel" "Channel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_templates_wedding_id_idx" ON "message_templates"("wedding_id");

-- CreateIndex
CREATE INDEX "message_templates_type_idx" ON "message_templates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_wedding_id_type_language_channel_key" ON "message_templates"("wedding_id", "type", "language", "channel");

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
