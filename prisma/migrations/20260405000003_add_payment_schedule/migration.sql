-- Create ScheduleReferenceDate enum
CREATE TYPE "ScheduleReferenceDate" AS ENUM ('WEDDING_DATE', 'SIGNING_DATE', 'FIXED_DATE');

-- Create ScheduleAmountType enum
CREATE TYPE "ScheduleAmountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- Add payment schedule date fields to contracts
ALTER TABLE "contracts" ADD COLUMN "payment_schedule_wedding_date" TIMESTAMP(3);
ALTER TABLE "contracts" ADD COLUMN "payment_schedule_signing_date" TIMESTAMP(3);

-- Create payment_schedule_template_items table
CREATE TABLE "payment_schedule_template_items" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "days_offset" INTEGER NOT NULL DEFAULT 0,
    "reference_date" "ScheduleReferenceDate" NOT NULL DEFAULT 'WEDDING_DATE',
    "fixed_date" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "amount_type" "ScheduleAmountType" NOT NULL DEFAULT 'FIXED',
    "amount_value" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_schedule_template_items_pkey" PRIMARY KEY ("id")
);

-- Create payment_schedule_items table for contracts
CREATE TABLE "contract_payment_schedule_items" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "days_offset" INTEGER NOT NULL DEFAULT 0,
    "reference_date" "ScheduleReferenceDate" NOT NULL DEFAULT 'WEDDING_DATE',
    "fixed_date" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "amount_type" "ScheduleAmountType" NOT NULL DEFAULT 'FIXED',
    "amount_value" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_payment_schedule_items_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "payment_schedule_template_items" ADD CONSTRAINT "payment_schedule_template_items_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contract_payment_schedule_items" ADD CONSTRAINT "contract_payment_schedule_items_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "payment_schedule_template_items_template_id_idx" ON "payment_schedule_template_items"("template_id");
CREATE INDEX "contract_payment_schedule_items_contract_id_idx" ON "contract_payment_schedule_items"("contract_id");
