-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LocationType') THEN
        CREATE TYPE "LocationType" AS ENUM ('CEREMONY', 'EVENT', 'PRE_EVENT', 'POST_EVENT');
    END IF;
END
$$;

-- AlterTable: make location nullable and add main_event_location_id
ALTER TABLE "weddings" ADD COLUMN IF NOT EXISTS "main_event_location_id" TEXT;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'weddings' AND column_name = 'location' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE "weddings" ALTER COLUMN "location" DROP NOT NULL;
    END IF;
END
$$;

-- CreateTable locations
CREATE TABLE IF NOT EXISTS "locations" (
    "id" TEXT NOT NULL,
    "planner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "notes" TEXT,
    "google_maps_url" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable itinerary_items
CREATE TABLE IF NOT EXISTS "itinerary_items" (
    "id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "item_type" "LocationType" NOT NULL DEFAULT 'EVENT',
    "date_time" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "locations_planner_id_idx" ON "locations"("planner_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "itinerary_items_wedding_id_idx" ON "itinerary_items"("wedding_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "itinerary_items_location_id_idx" ON "itinerary_items"("location_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "itinerary_items_wedding_id_order_idx" ON "itinerary_items"("wedding_id", "order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "weddings_main_event_location_id_idx" ON "weddings"("main_event_location_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'weddings_main_event_location_id_fkey') THEN
        ALTER TABLE "weddings" ADD CONSTRAINT "weddings_main_event_location_id_fkey" FOREIGN KEY ("main_event_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'locations_planner_id_fkey') THEN
        ALTER TABLE "locations" ADD CONSTRAINT "locations_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'itinerary_items_wedding_id_fkey') THEN
        ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'itinerary_items_location_id_fkey') THEN
        ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
