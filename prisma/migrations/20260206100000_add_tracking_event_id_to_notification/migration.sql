-- AlterTable
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='tracking_event_id') THEN
        ALTER TABLE "notifications" ADD COLUMN "tracking_event_id" TEXT;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_tracking_event_id_idx" ON "notifications"("tracking_event_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='notifications_tracking_event_id_fkey') THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tracking_event_id_fkey" FOREIGN KEY ("tracking_event_id") REFERENCES "tracking_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
