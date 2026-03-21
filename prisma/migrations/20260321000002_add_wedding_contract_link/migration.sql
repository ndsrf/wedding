-- AddColumn: contract_id on weddings for traceability / billing
ALTER TABLE "weddings" ADD COLUMN IF NOT EXISTS "contract_id" TEXT;

-- Foreign key from weddings.contract_id → contracts.id (SET NULL on delete)
ALTER TABLE "weddings"
  ADD CONSTRAINT "weddings_contract_id_fkey"
  FOREIGN KEY ("contract_id")
  REFERENCES "contracts"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Index for fast lookup of weddings by contract
CREATE INDEX IF NOT EXISTS "weddings_contract_id_idx" ON "weddings"("contract_id");
