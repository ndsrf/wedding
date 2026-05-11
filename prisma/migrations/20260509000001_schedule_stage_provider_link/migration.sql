-- Add provider link to schedule stages
ALTER TABLE "schedule_stages" ADD COLUMN "wedding_provider_id" TEXT;

ALTER TABLE "schedule_stages" ADD CONSTRAINT "schedule_stages_wedding_provider_id_fkey"
  FOREIGN KEY ("wedding_provider_id") REFERENCES "wedding_providers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "schedule_stages_wedding_provider_id_idx" ON "schedule_stages"("wedding_provider_id");
