-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ES', 'EN', 'FR', 'IT', 'DE');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK', 'INSTAGRAM', 'APPLE', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('AUTOMATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "WeddingStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('LINK_OPENED', 'RSVP_STARTED', 'RSVP_SUBMITTED', 'RSVP_UPDATED', 'GUEST_ADDED', 'PAYMENT_RECEIVED', 'REMINDER_SENT');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "GiftStatus" AS ENUM ('PENDING', 'RECEIVED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "TranslationContext" AS ENUM ('ADMIN', 'GUEST', 'PLANNER', 'MASTER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "master_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preferred_language" "Language" NOT NULL DEFAULT 'EN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_planners" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "google_id" TEXT,
    "auth_provider" "AuthProvider" NOT NULL,
    "last_login_provider" "AuthProvider",
    "preferred_language" "Language" NOT NULL DEFAULT 'EN',
    "logo_url" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "wedding_planners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "planner_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_system_theme" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "preview_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weddings" (
    "id" TEXT NOT NULL,
    "planner_id" TEXT NOT NULL,
    "theme_id" TEXT,
    "couple_names" TEXT NOT NULL,
    "wedding_date" TIMESTAMP(3) NOT NULL,
    "wedding_time" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "rsvp_cutoff_date" TIMESTAMP(3) NOT NULL,
    "dress_code" TEXT,
    "additional_info" TEXT,
    "payment_tracking_mode" "PaymentMode" NOT NULL DEFAULT 'MANUAL',
    "allow_guest_additions" BOOLEAN NOT NULL DEFAULT true,
    "default_language" "Language" NOT NULL DEFAULT 'ES',
    "status" "WeddingStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "weddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "google_id" TEXT,
    "auth_provider" "AuthProvider" NOT NULL,
    "last_login_provider" "AuthProvider",
    "preferred_language" "Language" NOT NULL DEFAULT 'EN',
    "wedding_id" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wedding_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp_number" TEXT,
    "magic_token" TEXT NOT NULL,
    "reference_code" TEXT,
    "channel_preference" "Channel",
    "preferred_language" "Language" NOT NULL DEFAULT 'ES',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MemberType" NOT NULL,
    "attending" BOOLEAN,
    "age" INTEGER,
    "dietary_restrictions" TEXT,
    "accessibility_needs" TEXT,
    "added_by_guest" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "channel" "Channel",
    "metadata" JSONB,
    "admin_triggered" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "family_id" TEXT,
    "event_type" "EventType" NOT NULL,
    "channel" "Channel",
    "details" JSONB NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gifts" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference_code_used" TEXT,
    "auto_matched" BOOLEAN NOT NULL DEFAULT false,
    "status" "GiftStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "value" TEXT NOT NULL,
    "context" "TranslationContext" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_admins_email_key" ON "master_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_planners_email_key" ON "wedding_planners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_planners_google_id_key" ON "wedding_planners"("google_id");

-- CreateIndex
CREATE INDEX "wedding_planners_enabled_idx" ON "wedding_planners"("enabled");

-- CreateIndex
CREATE INDEX "themes_planner_id_idx" ON "themes"("planner_id");

-- CreateIndex
CREATE INDEX "themes_is_system_theme_idx" ON "themes"("is_system_theme");

-- CreateIndex
CREATE INDEX "weddings_planner_id_idx" ON "weddings"("planner_id");

-- CreateIndex
CREATE INDEX "weddings_theme_id_idx" ON "weddings"("theme_id");

-- CreateIndex
CREATE INDEX "weddings_status_idx" ON "weddings"("status");

-- CreateIndex
CREATE INDEX "weddings_wedding_date_idx" ON "weddings"("wedding_date");

-- CreateIndex
CREATE INDEX "wedding_admins_wedding_id_idx" ON "wedding_admins"("wedding_id");

-- CreateIndex
CREATE INDEX "wedding_admins_email_idx" ON "wedding_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_admins_email_wedding_id_key" ON "wedding_admins"("email", "wedding_id");

-- CreateIndex
CREATE UNIQUE INDEX "families_magic_token_key" ON "families"("magic_token");

-- CreateIndex
CREATE UNIQUE INDEX "families_reference_code_key" ON "families"("reference_code");

-- CreateIndex
CREATE INDEX "families_wedding_id_idx" ON "families"("wedding_id");

-- CreateIndex
CREATE INDEX "families_magic_token_idx" ON "families"("magic_token");

-- CreateIndex
CREATE INDEX "families_reference_code_idx" ON "families"("reference_code");

-- CreateIndex
CREATE INDEX "families_email_idx" ON "families"("email");

-- CreateIndex
CREATE INDEX "family_members_family_id_idx" ON "family_members"("family_id");

-- CreateIndex
CREATE INDEX "family_members_added_by_guest_idx" ON "family_members"("added_by_guest");

-- CreateIndex
CREATE INDEX "tracking_events_family_id_idx" ON "tracking_events"("family_id");

-- CreateIndex
CREATE INDEX "tracking_events_wedding_id_idx" ON "tracking_events"("wedding_id");

-- CreateIndex
CREATE INDEX "tracking_events_event_type_idx" ON "tracking_events"("event_type");

-- CreateIndex
CREATE INDEX "tracking_events_timestamp_idx" ON "tracking_events"("timestamp");

-- CreateIndex
CREATE INDEX "notifications_wedding_id_idx" ON "notifications"("wedding_id");

-- CreateIndex
CREATE INDEX "notifications_admin_id_idx" ON "notifications"("admin_id");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "gifts_family_id_idx" ON "gifts"("family_id");

-- CreateIndex
CREATE INDEX "gifts_wedding_id_idx" ON "gifts"("wedding_id");

-- CreateIndex
CREATE INDEX "gifts_status_idx" ON "gifts"("status");

-- CreateIndex
CREATE INDEX "gifts_reference_code_used_idx" ON "gifts"("reference_code_used");

-- CreateIndex
CREATE INDEX "translations_context_idx" ON "translations"("context");

-- CreateIndex
CREATE INDEX "translations_language_idx" ON "translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "translations_key_language_key" ON "translations"("key", "language");

-- AddForeignKey
ALTER TABLE "themes" ADD CONSTRAINT "themes_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weddings" ADD CONSTRAINT "weddings_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weddings" ADD CONSTRAINT "weddings_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_admins" ADD CONSTRAINT "wedding_admins_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
