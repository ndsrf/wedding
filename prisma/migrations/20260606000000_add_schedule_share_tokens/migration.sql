-- Add share tokens for public read-only schedule links
-- admin_schedule_token: shared from the couple/admin view (couple-visible stages only)
-- planner_schedule_token: shared from the planner view (all stages)
ALTER TABLE "weddings" ADD COLUMN "admin_schedule_token" TEXT;
ALTER TABLE "weddings" ADD COLUMN "planner_schedule_token" TEXT;
CREATE UNIQUE INDEX "weddings_admin_schedule_token_key" ON "weddings"("admin_schedule_token");
CREATE UNIQUE INDEX "weddings_planner_schedule_token_key" ON "weddings"("planner_schedule_token");
