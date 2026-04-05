-- CreateEnum
CREATE TYPE "AlertEventType" AS ENUM ('RSVP_SUBMITTED', 'RSVP_UPDATED', 'PAYMENT_RECEIVED', 'TASK_COMPLETED', 'TASK_OVERDUE', 'GUEST_ADDED', 'CONTRACT_SIGNED', 'BUDGET_THRESHOLD', 'QUOTE_EXPIRED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AlertRecipientType" AS ENUM ('MASTER_ADMIN', 'WEDDING_PLANNER', 'COUPLE', 'GUEST');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "event_type" "AlertEventType" NOT NULL,
    "planner_id" TEXT,
    "wedding_id" TEXT,
    "notify_master_admin" BOOLEAN NOT NULL DEFAULT false,
    "notify_planner" BOOLEAN NOT NULL DEFAULT false,
    "notify_couple" BOOLEAN NOT NULL DEFAULT false,
    "notify_guest_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channels" "Channel"[],
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldown_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT,
    "event_type" "AlertEventType" NOT NULL,
    "wedding_id" TEXT,
    "planner_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_deliveries" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "recipient_type" "AlertRecipientType" NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "recipient_name" TEXT,
    "recipient_email" TEXT,
    "recipient_phone" TEXT,
    "recipient_language" "Language" NOT NULL DEFAULT 'EN',
    "channel" "Channel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "next_retry_at" TIMESTAMP(3),
    "last_error" TEXT,
    "external_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_rules_event_type_enabled_idx" ON "alert_rules"("event_type", "enabled");

-- CreateIndex
CREATE INDEX "alert_rules_planner_id_idx" ON "alert_rules"("planner_id");

-- CreateIndex
CREATE INDEX "alert_rules_wedding_id_idx" ON "alert_rules"("wedding_id");

-- CreateIndex
CREATE INDEX "alerts_event_type_idx" ON "alerts"("event_type");

-- CreateIndex
CREATE INDEX "alerts_wedding_id_idx" ON "alerts"("wedding_id");

-- CreateIndex
CREATE INDEX "alerts_planner_id_idx" ON "alerts"("planner_id");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_created_at_idx" ON "alerts"("created_at");

-- CreateIndex
CREATE INDEX "alert_deliveries_alert_id_idx" ON "alert_deliveries"("alert_id");

-- CreateIndex
CREATE INDEX "alert_deliveries_status_idx" ON "alert_deliveries"("status");

-- CreateIndex
CREATE INDEX "alert_deliveries_status_next_retry_at_idx" ON "alert_deliveries"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "alert_deliveries_recipient_type_recipient_id_idx" ON "alert_deliveries"("recipient_type", "recipient_id");

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_deliveries" ADD CONSTRAINT "alert_deliveries_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
