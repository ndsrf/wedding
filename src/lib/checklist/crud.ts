/**
 * Checklist CRUD Service for Wedding Checklists
 *
 * Manages wedding-specific checklist operations including fetching, creating,
 * updating, deleting, and reordering tasks. Includes upcoming tasks queries
 * for dashboard widgets.
 */

import { prisma } from '@/lib/db/prisma';
import { trace } from '@opentelemetry/api';
import type {
  ChecklistWithSections,
  ChecklistTaskData,
  UpdateChecklistTaskData,
  TaskOrderUpdate,
  UpcomingTask,
  TaskAssignment,
  TaskStatus,
  ChecklistSectionWithTasks,
} from '@/types/checklist';
import type { ChecklistTask } from '@prisma/client';

// ============================================================================
// CHECKLIST RETRIEVAL
// ============================================================================

/**
 * Get a wedding's complete checklist with all sections and tasks
 *
 * Returns sections with their tasks in the correct order, plus any orphaned tasks
 * (tasks not assigned to a section).
 *
 * @param wedding_id - The wedding ID
 * @returns Checklist with sections and tasks
 */
export async function getChecklist(
  wedding_id: string
): Promise<ChecklistWithSections> {
  // Fetch sections with their tasks
  const sections = await prisma.checklistSection.findMany({
    where: {
      wedding_id,
      template_id: null, // Only wedding sections
    },
    include: {
      tasks: {
        where: {
          wedding_id,
          template_id: null, // Only wedding tasks
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  // Fetch orphaned tasks (tasks with section_id but section doesn't exist, or section_id is null)
  const sectionIds = sections.map((s) => s.id);
  const orphanedTasks = await prisma.checklistTask.findMany({
    where: {
      wedding_id,
      template_id: null,
      OR: [
        { section_id: { notIn: sectionIds.length > 0 ? sectionIds : [''] } },
      ],
    },
    orderBy: { order: 'asc' },
  });

  return {
    sections: sections as ChecklistSectionWithTasks[],
    tasks: orphanedTasks,
  };
}

// ============================================================================
// TASK CRUD OPERATIONS
// ============================================================================

/**
 * Create a new task in a wedding checklist
 *
 * If section_id is provided, the task is added to that section.
 * Otherwise, it becomes an orphaned task.
 *
 * @param data - Task data including wedding_id, section_id, title, description, etc.
 * @returns The created task
 */
export async function createTask(
  data: ChecklistTaskData
): Promise<ChecklistTask> {
  // Validate that section exists if section_id is provided
  if (data.section_id) {
    const section = await prisma.checklistSection.findFirst({
      where: {
        id: data.section_id,
        wedding_id: data.wedding_id,
      },
    });

    if (!section) {
      throw new Error('Section not found or does not belong to this wedding');
    }
  }

  // Create the task
  const task = await prisma.checklistTask.create({
    data: {
      wedding_id: data.wedding_id,
      section_id: data.section_id,
      title: data.title,
      description: data.description,
      assigned_to: data.assigned_to,
      due_date: data.due_date,
      status: data.status,
      completed: data.completed,
      order: data.order,
      template_id: null, // Wedding tasks have null template_id
    },
  });

  return task;
}

/**
 * Update an existing task in a wedding checklist
 *
 * Validates that the task belongs to the specified wedding before updating.
 * Supports partial updates.
 *
 * @param task_id - The task ID to update
 * @param wedding_id - The wedding ID (for validation)
 * @param data - Partial task data to update
 * @returns The updated task
 */
export async function updateTask(
  task_id: string,
  wedding_id: string,
  data: UpdateChecklistTaskData
): Promise<ChecklistTask> {
  // Verify task exists and belongs to the wedding
  const existingTask = await prisma.checklistTask.findFirst({
    where: {
      id: task_id,
      wedding_id,
      template_id: null,
    },
  });

  if (!existingTask) {
    throw new Error('Task not found or does not belong to this wedding');
  }

  // Validate section if section_id is being updated
  if (data.section_id !== undefined) {
    if (data.section_id !== null) {
      const section = await prisma.checklistSection.findFirst({
        where: {
          id: data.section_id,
          wedding_id,
        },
      });

      if (!section) {
        throw new Error('Section not found or does not belong to this wedding');
      }
    }
  }

  // Handle completed status updates
  const updateData: Record<string, unknown> = { ...data };
  if (data.completed !== undefined) {
    if (data.completed) {
      updateData.completed_at = new Date();
      updateData.status = 'COMPLETED';
    } else {
      updateData.completed_at = null;
      // Don't automatically change status when un-completing
    }
  }

  // Update the task
  const task = await prisma.checklistTask.update({
    where: { id: task_id },
    data: updateData,
  });

  return task;
}

/**
 * Delete a task from a wedding checklist
 *
 * Validates that the task belongs to the specified wedding before deleting.
 *
 * @param task_id - The task ID to delete
 * @param wedding_id - The wedding ID (for validation)
 */
export async function deleteTask(
  task_id: string,
  wedding_id: string
): Promise<void> {
  // Verify task exists and belongs to the wedding
  const existingTask = await prisma.checklistTask.findFirst({
    where: {
      id: task_id,
      wedding_id,
      template_id: null,
    },
  });

  if (!existingTask) {
    throw new Error('Task not found or does not belong to this wedding');
  }

  // Delete the task
  await prisma.checklistTask.delete({
    where: { id: task_id },
  });
}

// ============================================================================
// SECTION CRUD OPERATIONS
// ============================================================================

/**
 * Create a new section in a wedding checklist
 *
 * @param data - Section data including wedding_id, name, and order
 * @returns The created section
 */
export async function createSection(data: {
  wedding_id: string;
  name: string;
  order: number;
}): Promise<ChecklistSectionWithTasks> {
  const section = await prisma.checklistSection.create({
    data: {
      wedding_id: data.wedding_id,
      name: data.name,
      order: data.order,
      template_id: null,
    },
    include: {
      tasks: true,
    },
  });

  return section as ChecklistSectionWithTasks;
}

/**
 * Update an existing section in a wedding checklist
 *
 * @param section_id - The section ID to update
 * @param wedding_id - The wedding ID (for validation)
 * @param data - Partial section data to update
 * @returns The updated section
 */
export async function updateSection(
  section_id: string,
  wedding_id: string,
  data: { name?: string; order?: number }
): Promise<ChecklistSectionWithTasks> {
  // Verify section exists and belongs to the wedding
  const existingSection = await prisma.checklistSection.findFirst({
    where: {
      id: section_id,
      wedding_id,
      template_id: null,
    },
  });

  if (!existingSection) {
    throw new Error('Section not found or does not belong to this wedding');
  }

  // Update the section
  const section = await prisma.checklistSection.update({
    where: { id: section_id },
    data,
    include: {
      tasks: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return section as ChecklistSectionWithTasks;
}

/**
 * Delete a section from a wedding checklist
 *
 * Note: This will NOT delete tasks in the section by default in Prisma
 * unless cascade delete is configured. In our schema, we should handle
 * what happens to tasks. For now, we'll assume cascade delete or
 * we can manually unassign tasks.
 *
 * @param section_id - The section ID to delete
 * @param wedding_id - The wedding ID (for validation)
 */
export async function deleteSection(
  section_id: string,
  wedding_id: string
): Promise<void> {
  // Verify section exists and belongs to the wedding
  const existingSection = await prisma.checklistSection.findFirst({
    where: {
      id: section_id,
      wedding_id,
      template_id: null,
    },
  });

  if (!existingSection) {
    throw new Error('Section not found or does not belong to this wedding');
  }

  // Use a transaction to ensure tasks are handled
  await prisma.$transaction(async (tx) => {
    // We'll delete the tasks in the section first to be safe
    await tx.checklistTask.deleteMany({
      where: {
        section_id,
        wedding_id,
      },
    });

    // Then delete the section
    await tx.checklistSection.delete({
      where: { id: section_id },
    });
  });
}

/**
 * Reorder sections within a wedding checklist
 *
 * @param wedding_id - The wedding ID
 * @param sectionOrders - Array of section IDs with their new order values
 */
export async function reorderSections(
  wedding_id: string,
  sectionOrders: { id: string; order: number }[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const sectionOrder of sectionOrders) {
      await tx.checklistSection.updateMany({
        where: {
          id: sectionOrder.id,
          wedding_id,
          template_id: null,
        },
        data: { order: sectionOrder.order },
      });
    }
  });
}

// ============================================================================
// TASK REORDERING
// ============================================================================

/**
 * Reorder tasks within a wedding checklist
 *
 * Updates the order field for multiple tasks in a single transaction.
 * Used for drag-and-drop functionality.
 *
 * @param wedding_id - The wedding ID
 * @param taskOrders - Array of task IDs with their new order values
 */
export async function reorderTasks(
  wedding_id: string,
  taskOrders: TaskOrderUpdate[]
): Promise<void> {
  // Use transaction to ensure all updates succeed or fail together
  await prisma.$transaction(async (tx) => {
    // Verify all tasks belong to the wedding
    const taskIds = taskOrders.map((t) => t.id);
    const tasks = await tx.checklistTask.findMany({
      where: {
        id: { in: taskIds },
        wedding_id,
        template_id: null,
      },
      select: { id: true },
    });

    if (tasks.length !== taskIds.length) {
      throw new Error('One or more tasks not found or do not belong to this wedding');
    }

    // Update each task's order
    for (const taskOrder of taskOrders) {
      await tx.checklistTask.update({
        where: { id: taskOrder.id },
        data: { order: taskOrder.order },
      });
    }
  });
}

// ============================================================================
// UPCOMING TASKS QUERIES
// ============================================================================

/**
 * Get upcoming tasks for dashboard widgets
 *
 * Returns tasks that are not completed, sorted by due date.
 * Includes color coding based on urgency (days until due).
 *
 * For admin widget: Returns tasks for a single wedding
 * For planner widget: Call this function for each wedding
 *
 * @param wedding_id - The wedding ID
 * @param assigned_to - Optional filter by assignment (WEDDING_PLANNER, COUPLE, OTHER)
 * @param limit - Maximum number of tasks to return (default: 5)
 * @returns Array of upcoming tasks with additional context
 */
export async function getUpcomingTasks(
  wedding_id: string,
  assigned_to?: TaskAssignment,
  limit: number = 5
): Promise<UpcomingTask[]> {
  return trace.getTracer('checklist-service').startActiveSpan('getUpcomingTasks', async (span) => {
    try {
      span.setAttribute('wedding.id', wedding_id);
      if (assigned_to) span.setAttribute('task.assigned_to', assigned_to);
      span.setAttribute('query.limit', limit);

      // Build where clause
      const where: Record<string, unknown> = {
        wedding_id,
        template_id: null,
        completed: false,
      };

      if (assigned_to) {
        where.assigned_to = assigned_to;
      }

      // Fetch tasks with section information
      const tasks = await prisma.checklistTask.findMany({
        where,
        include: {
          section: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          { due_date: { sort: 'asc', nulls: 'last' } },
          { order: 'asc' },
        ],
        take: limit,
      });

      // Calculate urgency and format results
      const now = new Date();
      const upcomingTasks: UpcomingTask[] = tasks.map((task) => {
        let days_until_due: number | null = null;
        let urgency_color: 'red' | 'orange' | 'green' = 'green';

        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          const diffTime = dueDate.getTime() - now.getTime();
          days_until_due = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Color coding: red for past due or due today, orange for <30 days, green for >=30 days
          if (days_until_due < 0) {
            urgency_color = 'red';
          } else if (days_until_due < 30) {
            urgency_color = 'orange';
          } else {
            urgency_color = 'green';
          }
        }

        return {
          ...task,
          section_name: task.section?.name || null,
          wedding_id: task.wedding_id!,
          days_until_due,
          urgency_color,
        };
      });

      return upcomingTasks;
    } finally {
      span.end();
    }
  });
}

// Row shape returned by the window-function raw query below.
interface PlannerRawTaskRow {
  id: string;
  section_id: string | null;
  wedding_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string;
  due_date: Date | null;
  due_date_relative: string | null;
  status: string;
  completed: boolean;
  completed_at: Date | null;
  completed_by: string | null;
  order: number;
  created_at: Date;
  updated_at: Date;
  section_name: string | null;
  wedding_couple_names: string | null;
}

/**
 * Get upcoming tasks for planner dashboard widget
 *
 * Uses a single raw SQL query with a ROW_NUMBER() window function partitioned
 * by (wedding_id, assigned_to) to enforce the per-wedding limit at the database
 * level. This avoids fetching all incomplete tasks into memory and filtering
 * in application code, which would be expensive when many undated tasks exist.
 *
 * Undated tasks (due_date IS NULL) are included and sorted after dated tasks
 * via NULLS LAST.
 *
 * @param planner_id - The wedding planner's ID
 * @param limit_per_wedding - Maximum tasks per wedding per assignee type (default: 3)
 * @returns Split arrays of upcoming tasks with wedding context
 */
export async function getUpcomingTasksForPlanner(
  planner_id: string,
  limit_per_wedding: number = 3
): Promise<{ plannerTasks: UpcomingTask[]; coupleTasks: UpcomingTask[]; otherTasks: UpcomingTask[] }> {
  // Single query: joins weddings inline (no separate round-trip), ranks tasks
  // within each (wedding_id, assigned_to) partition, and filters to the top N.
  const rows = await prisma.$queryRaw<PlannerRawTaskRow[]>`
    WITH ranked AS (
      SELECT
        t.id,
        t.section_id,
        t.wedding_id,
        t.template_id,
        t.title,
        t.description,
        t.assigned_to,
        t.due_date,
        t.due_date_relative,
        t.status,
        t.completed,
        t.completed_at,
        t.completed_by,
        t."order",
        t.created_at,
        t.updated_at,
        s.name              AS section_name,
        w.couple_names      AS wedding_couple_names,
        ROW_NUMBER() OVER (
          PARTITION BY t.wedding_id, t.assigned_to
          ORDER BY t.due_date ASC NULLS LAST, t."order" ASC
        )                   AS rn
      FROM checklist_tasks t
      JOIN  weddings          w ON w.id = t.wedding_id
      LEFT JOIN checklist_sections s ON s.id = t.section_id
      WHERE
        w.planner_id  = ${planner_id}
        AND w.status      = 'ACTIVE'
        AND w.deleted_at  IS NULL
        AND w.is_disabled = false
        AND t.template_id IS NULL
        AND t.completed   = false
    )
    SELECT
      id, section_id, wedding_id, template_id, title, description,
      assigned_to, due_date, due_date_relative, status, completed,
      completed_at, completed_by, "order", created_at, updated_at,
      section_name, wedding_couple_names
    FROM ranked
    WHERE rn <= ${limit_per_wedding}
    ORDER BY due_date ASC NULLS LAST, "order" ASC
  `;

  if (rows.length === 0) return { plannerTasks: [], coupleTasks: [], otherTasks: [] };

  const now = new Date();
  const plannerTasks: UpcomingTask[] = [];
  const coupleTasks: UpcomingTask[] = [];
  const otherTasks: UpcomingTask[] = [];

  for (const row of rows) {
    let days_until_due: number | null = null;
    let urgency_color: 'red' | 'orange' | 'green' = 'green';

    if (row.due_date) {
      const diffTime = new Date(row.due_date).getTime() - now.getTime();
      days_until_due = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (days_until_due < 0) {
        urgency_color = 'red';
      } else if (days_until_due < 30) {
        urgency_color = 'orange';
      }
    }

    const task = {
      ...row,
      assigned_to: row.assigned_to as TaskAssignment,
      status: row.status as TaskStatus,
      wedding_couple_names: row.wedding_couple_names ?? undefined,
      section_name: row.section_name,
      days_until_due,
      urgency_color,
    } as UpcomingTask;

    if (row.assigned_to === 'WEDDING_PLANNER') {
      plannerTasks.push(task);
    } else if (row.assigned_to === 'COUPLE') {
      coupleTasks.push(task);
    } else {
      otherTasks.push(task);
    }
  }

  return { plannerTasks, coupleTasks, otherTasks };
}
