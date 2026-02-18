-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('CEREMONY', 'EVENT', 'PRE_EVENT', 'POST_EVENT');

-- AlterTable
ALTER TABLE "weddings" ADD COLUMN "main_event_location_id" TEXT,
ALTER COLUMN "location" DROP NOT NULL;

-- CreateTable
CREATE TABLE "locations" (
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

-- CreateTable
CREATE TABLE "itinerary_items" (
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
CREATE INDEX "locations_planner_id_idx" ON "locations"("planner_id");

-- CreateIndex
CREATE INDEX "itinerary_items_wedding_id_idx" ON "itinerary_items"("wedding_id");

-- CreateIndex
CREATE INDEX "itinerary_items_location_id_idx" ON "itinerary_items"("location_id");

-- CreateIndex
CREATE INDEX "itinerary_items_wedding_id_order_idx" ON "itinerary_items"("wedding_id", "order");

-- CreateIndex
CREATE INDEX "weddings_main_event_location_id_idx" ON "weddings"("main_event_location_id");

-- AddForeignKey
ALTER TABLE "weddings" ADD CONSTRAINT "weddings_main_event_location_id_fkey" FOREIGN KEY ("main_event_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
