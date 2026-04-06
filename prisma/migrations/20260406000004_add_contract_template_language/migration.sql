-- AddColumn: language to contract_templates
-- Default all existing templates to 'ES' (Spanish)
ALTER TABLE "contract_templates" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'ES';
