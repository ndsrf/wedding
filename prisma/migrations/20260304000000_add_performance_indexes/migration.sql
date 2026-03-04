-- Migration: add_performance_indexes
-- Adds composite indexes to speed up the most expensive recurring queries:
--   1. Upcoming tasks widget (checklist_tasks filtered by wedding, completion, assignee, due date)
--   2. Attendance count queries (family_members filtered by family + attending)
--   3. Payment status queries (gifts filtered by wedding + status)

-- ChecklistTask: composite index for upcoming tasks queries
-- Covers: WHERE wedding_id = ? AND completed = false AND assigned_to = ? AND due_date IS NOT NULL
-- Also covers the batched planner query (wedding_id IN (...) AND ...)
CREATE INDEX "checklist_tasks_wedding_id_completed_assigned_to_due_date_idx"
  ON "checklist_tasks"("wedding_id", "completed", "assigned_to", "due_date");

-- FamilyMember: composite index for attendance count queries
-- Covers: WHERE family_id = ? AND attending = true/false/null
CREATE INDEX "family_members_family_id_attending_idx"
  ON "family_members"("family_id", "attending");

-- Gift: composite index for payment stats queries
-- Covers: WHERE wedding_id = ? AND status IN ('RECEIVED', 'CONFIRMED')
CREATE INDEX "gifts_wedding_id_status_idx"
  ON "gifts"("wedding_id", "status");
