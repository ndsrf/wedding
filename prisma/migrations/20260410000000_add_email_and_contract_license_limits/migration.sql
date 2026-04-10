-- AlterEnum
ALTER TYPE "ResourceType" ADD VALUE 'EMAIL';
ALTER TYPE "ResourceType" ADD VALUE 'CONTRACT';

-- AlterTable
ALTER TABLE "planner_licenses" ADD COLUMN "max_contracts_per_month" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "planner_licenses" ADD COLUMN "max_emails_per_month" INTEGER NOT NULL DEFAULT 1000;
