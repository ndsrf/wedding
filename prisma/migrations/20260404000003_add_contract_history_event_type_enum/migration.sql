-- CreateEnum
CREATE TYPE "ContractHistoryEventType" AS ENUM ('edit', 'comment_added', 'comment_resolved');

-- AlterTable
ALTER TABLE "contract_history_events"
  ALTER COLUMN "event_type" TYPE "ContractHistoryEventType"
  USING "event_type"::"ContractHistoryEventType";
