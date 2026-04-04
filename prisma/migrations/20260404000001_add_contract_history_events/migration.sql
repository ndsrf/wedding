-- CreateTable
CREATE TABLE "contract_history_events" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "actor_color" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_history_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contract_history_events_contract_id_idx" ON "contract_history_events"("contract_id");

-- AddForeignKey
ALTER TABLE "contract_history_events" ADD CONSTRAINT "contract_history_events_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
