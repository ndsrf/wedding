/**
 * Checklist Notification Service
 *
 * Handles creating notifications for task-related events.
 * Notifications inform wedding admins and planners about task assignments and completions.
 */

import { prisma } from '@/lib/db/prisma';
import type { TaskNotificationData } from '@/types/checklist';
import type { EventType } from '@prisma/client';

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Create a notification for task assignment
 *
 * Creates a notification in the Notification table when a task is assigned.
 * Does not block the main operation if notification creation fails.
 *
 * @param data - Task notification data including wedding_id, task details, and admin_id
 * @returns Success result with notification ID or error
 *
 * @example
 * ```ts
 * const result = await createTaskAssignedNotification({
 *   wedding_id: 'wedding-123',
 *   task_id: 'task-456',
 *   task_title: 'Book caterer',
 *   assigned_to: 'COUPLE',
 *   due_date: new Date('2024-06-01'),
 *   event_type: 'TASK_ASSIGNED',
 *   admin_id: 'admin-789',
 *   section_name: 'Catering'
 * });
 * ```
 */
export async function createTaskAssignedNotification(
  data: TaskNotificationData
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const {
    wedding_id,
    task_id,
    task_title,
    assigned_to,
    due_date,
    admin_id,
    section_name,
  } = data;

  try {
    // Validate event type
    if (data.event_type !== 'TASK_ASSIGNED') {
      console.error(
        `[NOTIFICATION] Invalid event type for task assignment: ${data.event_type}`
      );
      return {
        success: false,
        error: 'Invalid event type - expected TASK_ASSIGNED',
      };
    }

    // Build notification details with all context
    const details = {
      task_id,
      task_title,
      assigned_to,
      due_date: due_date?.toISOString() || null,
      section_name: section_name || null,
      message: `Task "${task_title}" has been assigned to ${formatAssignee(assigned_to)}`,
    };

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        wedding_id,
        family_id: null, // Task notifications are for admins/planners, not families
        event_type: 'TASK_ASSIGNED' as EventType,
        channel: null, // Task notifications are in-app only
        details,
        read: false,
        admin_id,
      },
    });

    console.log(
      `[NOTIFICATION] Task assigned notification created for task "${task_title}" (${task_id})`
    );

    return {
      success: true,
      notificationId: notification.id,
    };
  } catch (error) {
    // Log error but don't throw - notification failures shouldn't break task operations
    console.error('[NOTIFICATION] Failed to create task assigned notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Create a notification for task completion
 *
 * Creates a notification in the Notification table when a task is marked as completed.
 * Does not block the main operation if notification creation fails.
 *
 * @param data - Task notification data including wedding_id, task details, admin_id, and completed_by
 * @returns Success result with notification ID or error
 *
 * @example
 * ```ts
 * const result = await createTaskCompletedNotification({
 *   wedding_id: 'wedding-123',
 *   task_id: 'task-456',
 *   task_title: 'Book caterer',
 *   assigned_to: 'COUPLE',
 *   due_date: new Date('2024-06-01'),
 *   event_type: 'TASK_COMPLETED',
 *   admin_id: 'admin-789',
 *   completed_by: 'admin-789',
 *   section_name: 'Catering'
 * });
 * ```
 */
export async function createTaskCompletedNotification(
  data: TaskNotificationData
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const {
    wedding_id,
    task_id,
    task_title,
    assigned_to,
    due_date,
    admin_id,
    completed_by,
    section_name,
  } = data;

  try {
    // Validate event type
    if (data.event_type !== 'TASK_COMPLETED') {
      console.error(
        `[NOTIFICATION] Invalid event type for task completion: ${data.event_type}`
      );
      return {
        success: false,
        error: 'Invalid event type - expected TASK_COMPLETED',
      };
    }

    // Build notification details with all context
    const details = {
      task_id,
      task_title,
      assigned_to,
      due_date: due_date?.toISOString() || null,
      section_name: section_name || null,
      completed_by: completed_by || null,
      message: `Task "${task_title}" has been completed${
        completed_by ? ` by user ${completed_by}` : ''
      }`,
    };

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        wedding_id,
        family_id: null, // Task notifications are for admins/planners, not families
        event_type: 'TASK_COMPLETED' as EventType,
        channel: null, // Task notifications are in-app only
        details,
        read: false,
        admin_id,
      },
    });

    console.log(
      `[NOTIFICATION] Task completed notification created for task "${task_title}" (${task_id})`
    );

    return {
      success: true,
      notificationId: notification.id,
    };
  } catch (error) {
    // Log error but don't throw - notification failures shouldn't break task operations
    console.error('[NOTIFICATION] Failed to create task completed notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format task assignee for display in notifications
 *
 * @param assigned_to - TaskAssignment enum value
 * @returns Formatted assignee string
 */
function formatAssignee(assigned_to: string): string {
  switch (assigned_to) {
    case 'WEDDING_PLANNER':
      return 'Wedding Planner';
    case 'COUPLE':
      return 'Couple';
    case 'OTHER':
      return 'Other';
    default:
      return assigned_to;
  }
}
