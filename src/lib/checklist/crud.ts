/**
 * Checklist CRUD Service for Wedding Checklists
 *
 * Manages wedding-specific checklist operations including fetching, creating,
 * updating, deleting, and reordering tasks. Includes upcoming tasks queries
 * for dashboard widgets.
 */

import { prisma } from '@/lib/db/prisma';
import type {
  ChecklistWithSections,
  ChecklistTaskData,
  UpdateChecklistTaskData,
  TaskOrderUpdate,
  UpcomingTask,
  TaskAssignment,
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
  // Build where clause
  const where: Record<string, unknown> = {
    wedding_id,
    template_id: null,
    completed: false,
    due_date: { not: null }, // Only tasks with due dates
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
      { due_date: 'asc' },
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
}

/**
 * Get upcoming tasks for planner dashboard widget
 *
 * Returns tasks across multiple weddings, grouped by wedding.
 * Used for the planner dashboard to show tasks from all their weddings.
 *
 * @param planner_id - The wedding planner's ID
 * @param limit_per_wedding - Maximum tasks per wedding (default: 3)
 * @returns Array of upcoming tasks with wedding context
 */
export async function getUpcomingTasksForPlanner(
  planner_id: string,
  limit_per_wedding: number = 3
): Promise<UpcomingTask[]> {
  // Get all weddings for this planner
  const weddings = await prisma.wedding.findMany({
    where: {
      planner_id,
    },
    select: {
      id: true,
      couple_names: true,
    },
  });

  // Fetch upcoming tasks for each wedding
  const allTasks: UpcomingTask[] = [];

  for (const wedding of weddings) {
    // Filter by WEDDING_PLANNER assignment for planner dashboard
    const tasks = await getUpcomingTasks(wedding.id, 'WEDDING_PLANNER', limit_per_wedding);

    // Add wedding name to each task
    const tasksWithWeddingName = tasks.map((task) => ({
      ...task,
      wedding_couple_names: wedding.couple_names,
    }));

    allTasks.push(...tasksWithWeddingName);
  }

  // Sort all tasks by due date across all weddings
  allTasks.sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  return allTasks;
}
