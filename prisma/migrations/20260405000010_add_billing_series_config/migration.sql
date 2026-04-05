-- Add billing series configuration fields to wedding_planners
ALTER TABLE "wedding_planners"
  ADD COLUMN "invoice_series"             TEXT NOT NULL DEFAULT 'FAC',
  ADD COLUMN "rectification_series"       TEXT NOT NULL DEFAULT 'REC',
  ADD COLUMN "proforma_series"            TEXT NOT NULL DEFAULT 'PRO',
  ADD COLUMN "invoice_start_number"       INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "rectification_start_number" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "proforma_start_number"      INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "last_external_hash"         TEXT;
