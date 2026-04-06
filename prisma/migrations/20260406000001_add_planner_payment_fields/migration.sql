-- Add payment/banking fields to wedding_planners
ALTER TABLE "wedding_planners"
  ADD COLUMN "bank_account"    TEXT,
  ADD COLUMN "accepts_bizum"   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "accepts_revolut" BOOLEAN NOT NULL DEFAULT FALSE;
