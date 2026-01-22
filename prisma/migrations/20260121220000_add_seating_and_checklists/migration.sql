-- CreateEnum
CREATE TYPE "TaskAssignment" AS ENUM ('WEDDING_PLANNER', 'COUPLE', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "EventType" ADD VALUE 'TASK_COMPLETED';

-- AlterTable
ALTER TABLE "family_members" ADD COLUMN "seating_group" TEXT,
ADD COLUMN "table_id" TEXT;

-- AlterTable
ALTER TABLE "weddings" ADD COLUMN "couple_table_id" TEXT;

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "name" TEXT,
    "number" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_sections" (
    "id" TEXT NOT NULL,
    "template_id" TEXT,
    "wedding_id" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_tasks" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to" "TaskAssignment" NOT NULL DEFAULT 'COUPLE',
    "due_date" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" TEXT NOT NULL,
    "planner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tables_wedding_id_idx" ON "tables"("wedding_id");

-- CreateIndex
CREATE UNIQUE INDEX "tables_wedding_id_number_key" ON "tables"("wedding_id", "number");

-- CreateIndex
CREATE INDEX "checklist_sections_order_idx" ON "checklist_sections"("order");

-- CreateIndex
CREATE INDEX "checklist_sections_template_id_idx" ON "checklist_sections"("template_id");

-- CreateIndex
CREATE INDEX "checklist_sections_wedding_id_idx" ON "checklist_sections"("wedding_id");

-- CreateIndex
CREATE INDEX "checklist_tasks_assigned_to_idx" ON "checklist_tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "checklist_tasks_completed_idx" ON "checklist_tasks"("completed");

-- CreateIndex
CREATE INDEX "checklist_tasks_due_date_idx" ON "checklist_tasks"("due_date");

-- CreateIndex
CREATE INDEX "checklist_tasks_order_idx" ON "checklist_tasks"("order");

-- CreateIndex
CREATE INDEX "checklist_tasks_section_id_idx" ON "checklist_tasks"("section_id");

-- CreateIndex
CREATE INDEX "checklist_tasks_status_idx" ON "checklist_tasks"("status");

-- CreateIndex
CREATE INDEX "checklist_tasks_wedding_id_idx" ON "checklist_tasks"("wedding_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_templates_planner_id_key" ON "checklist_templates"("planner_id");

-- CreateIndex
CREATE INDEX "checklist_templates_planner_id_idx" ON "checklist_templates"("planner_id");

-- CreateIndex
CREATE INDEX "family_members_table_id_idx" ON "family_members"("table_id");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_sections" ADD CONSTRAINT "checklist_sections_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_sections" ADD CONSTRAINT "checklist_sections_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_tasks" ADD CONSTRAINT "checklist_tasks_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "checklist_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_tasks" ADD CONSTRAINT "checklist_tasks_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
