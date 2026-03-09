-- Migration: add_phone_to_wedding_admins
-- Adds optional phone field to wedding_admins table for WhatsApp routing.

ALTER TABLE "wedding_admins" ADD COLUMN IF NOT EXISTS "phone" TEXT;
