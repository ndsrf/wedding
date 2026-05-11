-- CreateTable
CREATE TABLE "schedule_templates" (
    "id" TEXT NOT NULL,
    "planner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_blocks" (
    "id" TEXT NOT NULL,
    "template_id" TEXT,
    "wedding_id" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT DEFAULT '#6366f1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_stages" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "notes" TEXT,
    "visible_to_couple" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_schedules" (
    "id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_templates_planner_id_key" ON "schedule_templates"("planner_id");
CREATE INDEX "schedule_templates_planner_id_idx" ON "schedule_templates"("planner_id");
CREATE INDEX "schedule_blocks_template_id_idx" ON "schedule_blocks"("template_id");
CREATE INDEX "schedule_blocks_wedding_id_idx" ON "schedule_blocks"("wedding_id");
CREATE INDEX "schedule_blocks_order_idx" ON "schedule_blocks"("order");
CREATE INDEX "schedule_stages_block_id_idx" ON "schedule_stages"("block_id");
CREATE INDEX "schedule_stages_order_idx" ON "schedule_stages"("order");
CREATE UNIQUE INDEX "wedding_schedules_wedding_id_key" ON "wedding_schedules"("wedding_id");
CREATE INDEX "wedding_schedules_wedding_id_idx" ON "wedding_schedules"("wedding_id");

-- AddForeignKey
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_planner_id_fkey"
    FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "schedule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_wedding_id_fkey"
    FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "schedule_stages" ADD CONSTRAINT "schedule_stages_block_id_fkey"
    FOREIGN KEY ("block_id") REFERENCES "schedule_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wedding_schedules" ADD CONSTRAINT "wedding_schedules_wedding_id_fkey"
    FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
