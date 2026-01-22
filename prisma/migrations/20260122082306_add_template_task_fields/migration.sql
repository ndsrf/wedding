-- AlterTable: Make wedding_id nullable for template tasks
ALTER TABLE "checklist_tasks" ALTER COLUMN "wedding_id" DROP NOT NULL;

-- AlterTable: Add template support fields
ALTER TABLE "checklist_tasks" ADD COLUMN "template_id" TEXT;
ALTER TABLE "checklist_tasks" ADD COLUMN "due_date_relative" TEXT;
ALTER TABLE "checklist_tasks" ADD COLUMN "completed_at" TIMESTAMP(3);
ALTER TABLE "checklist_tasks" ADD COLUMN "completed_by" TEXT;

-- CreateIndex
CREATE INDEX "checklist_tasks_template_id_idx" ON "checklist_tasks"("template_id");

-- AddForeignKey
ALTER TABLE "checklist_tasks" ADD CONSTRAINT "checklist_tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
