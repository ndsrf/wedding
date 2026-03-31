-- Add PriceType enum for provider categories
CREATE TYPE "PriceType" AS ENUM ('PER_PERSON', 'GLOBAL');

-- Add price_type to provider_categories
ALTER TABLE "provider_categories" ADD COLUMN "price_type" "PriceType" NOT NULL DEFAULT 'GLOBAL';

-- Add planned_guests to weddings
ALTER TABLE "weddings" ADD COLUMN "planned_guests" INTEGER;

-- Add budgeted_price to wedding_providers
ALTER TABLE "wedding_providers" ADD COLUMN "budgeted_price" DECIMAL(10,2);
