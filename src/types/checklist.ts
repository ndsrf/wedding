/**
 * Checklist System Types
 *
 * TypeScript type definitions for the wedding checklist feature.
 * Includes template management, task operations, Excel import/export, and notifications.
 */

import type {
  ChecklistTemplate,
  ChecklistSection,
  ChecklistTask,
  TaskAssignment,
  TaskStatus,
  EventType,
} from '@prisma/client';

// ============================================================================
// ENUMS - Re-export from Prisma for convenience
// ============================================================================

export type { TaskAssignment, TaskStatus, ChecklistTask };

// ============================================================================
// RELATIVE DATE FORMAT
// ============================================================================

/**
 * Relative date format for template tasks
 * Examples: "WEDDING_DATE", "WEDDING_DATE-90", "WEDDING_DATE+7"
 */
export type RelativeDateFormat =
  | `WEDDING_DATE${'+' | '-'}${number}`
  | 'WEDDING_DATE';

// ============================================================================
// TEMPLATE MANAGEMENT TYPES
// ============================================================================

/**
 * Data structure for creating or updating a checklist template
 */
export interface CreateTemplateData {
  planner_id: string;
  sections: CreateTemplateSectionData[];
}

/**
 * Section data for template creation
 */
export interface CreateTemplateSectionData {
  name: string;
  order: number;
  tasks: CreateTemplateTaskData[];
}

/**
 * Task data for template creation
 */
export interface CreateTemplateTaskData {
  title: string;
  description: string | null;
  assigned_to: TaskAssignment;
  due_date_relative: string | null; // e.g., "WEDDING_DATE-90"
  order: number;
}

/**
 * Complete template with sections and tasks (for API responses)
 */
export interface ChecklistTemplateWithSections extends ChecklistTemplate {
  sections: ChecklistSectionWithTasks[];
}

/**
 * Section with tasks (for API responses)
 */
export interface ChecklistSectionWithTasks extends ChecklistSection {
  tasks: ChecklistTask[];
}

// ============================================================================
// CHECKLIST TASK CRUD TYPES
// ============================================================================

/**
 * Data structure for creating or updating a checklist task
 */
export interface ChecklistTaskData {
  wedding_id: string;
  section_id: string | null;
  title: string;
  description: string | null;
  assigned_to: TaskAssignment;
  due_date: Date | null;
  status: TaskStatus;
  completed: boolean;
  order: number;
}

/**
 * Partial update data for checklist tasks
 */
export type UpdateChecklistTaskData = Partial<Omit<ChecklistTaskData, 'wedding_id'>>;

/**
 * Complete checklist with sections and tasks (for API responses)
 */
export interface ChecklistWithSections {
  sections: ChecklistSectionWithTasks[];
  tasks: ChecklistTask[]; // Tasks without sections (orphaned)
}

/**
 * Task order update for drag-and-drop reordering
 */
export interface TaskOrderUpdate {
  id: string;
  order: number;
}

/**
 * Upcoming task with additional context for dashboard widgets
 */
export interface UpcomingTask extends ChecklistTask {
  section_name: string | null;
  wedding_id: string;
  wedding_couple_names?: string; // For planner widget
  days_until_due: number | null;
  urgency_color: 'red' | 'orange' | 'green';
}

// ============================================================================
// DATE CONVERSION TYPES
// ============================================================================

/**
 * Result of parsing a relative date string
 */
export interface RelativeDateParseResult {
  offset: number; // Number of days relative to wedding date (negative for before, positive for after)
}

// ============================================================================
// EXCEL IMPORT TYPES
// ============================================================================

/**
 * Row structure for Excel import
 */
export interface ChecklistImportRow {
  section: string;
  title: string;
  description: string | null;
  assigned_to: string; // String value, will be validated to TaskAssignment
  due_date: string; // Can be relative (WEDDING_DATE-90) or absolute (YYYY-MM-DD)
  status: string; // String value, will be validated to TaskStatus
  completed?: boolean; // Optional, defaults to false
}

/**
 * Preview of import changes before confirmation
 */
export interface ImportPreview {
  newTasks: number;
  updatedTasks: number;
  sections: string[];
  rows: ChecklistImportRow[];
  warnings: ValidationWarning[];
}

/**
 * Result of import operation
 */
export interface ImportResult {
  success: boolean;
  tasksCreated: number;
  tasksUpdated: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error with row number and field details
 */
export interface ValidationError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}

/**
 * Validation warning (non-blocking)
 */
export interface ValidationWarning {
  row: number;
  message: string;
}

// ============================================================================
// EXCEL EXPORT TYPES
// ============================================================================

/**
 * Options for Excel export
 */
export interface ExportOptions {
  format?: 'xlsx' | 'csv';
  includeCompleted?: boolean; // Whether to include completed tasks
  relativeDates?: boolean; // For template export, use relative dates
}

/**
 * Result of Excel export operation
 */
export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

/**
 * Data for creating task-related notifications
 */
export interface TaskNotificationData {
  wedding_id: string;
  task_id: string;
  task_title: string;
  assigned_to: TaskAssignment;
  due_date: Date | null;
  event_type: Extract<EventType, 'TASK_ASSIGNED' | 'TASK_COMPLETED'>;
  admin_id: string; // User who triggered the notification
  completed_by?: string; // User who completed the task (for TASK_COMPLETED)
  section_name?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to save template
 */
export interface SaveTemplateRequest {
  sections: CreateTemplateSectionData[];
}

/**
 * Request to create a task
 */
export interface CreateTaskRequest {
  section_id: string | null;
  title: string;
  description: string | null;
  assigned_to: TaskAssignment;
  due_date: string | null; // ISO date string
  status: TaskStatus;
  order: number;
}

/**
 * Request to update a task
 */
export interface UpdateTaskRequest {
  section_id?: string | null;
  title?: string;
  description?: string | null;
  assigned_to?: TaskAssignment;
  due_date?: string | null; // ISO date string
  status?: TaskStatus;
  completed?: boolean;
  order?: number;
}

/**
 * Request to reorder tasks
 */
export interface ReorderTasksRequest {
  taskOrders: TaskOrderUpdate[];
}

/**
 * Request to copy template to wedding
 */
export interface CopyTemplateRequest {
  wedding_id: string;
}

/**
 * Request to preview import
 */
export interface PreviewImportRequest {
  wedding_id: string;
  file: File;
}

/**
 * Request to import checklist
 */
export interface ImportChecklistRequest {
  wedding_id: string;
  file: File;
  wedding_date: string; // ISO date string, needed for relative date conversion
}

/**
 * Query parameters for upcoming tasks
 */
export interface UpcomingTasksQuery {
  wedding_id?: string; // For admin widget (single wedding)
  planner_id?: string; // For planner widget (all weddings)
  assigned_to?: TaskAssignment;
  limit?: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a string is a valid TaskAssignment
 */
export function isTaskAssignment(value: unknown): value is TaskAssignment {
  return (
    typeof value === 'string' &&
    ['WEDDING_PLANNER', 'COUPLE', 'OTHER'].includes(value)
  );
}

/**
 * Type guard to check if a string is a valid TaskStatus
 */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === 'string' &&
    ['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(value)
  );
}

/**
 * Type guard to check if a string is a valid RelativeDateFormat
 */
export function isValidRelativeDateFormat(value: string): value is RelativeDateFormat {
  if (value === 'WEDDING_DATE') {
    return true;
  }

  const relativeDatePattern = /^WEDDING_DATE[+-]\d+$/;
  return relativeDatePattern.test(value);
}

/**
 * Type guard to check if a value is a valid date
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Create types - Omit auto-generated fields
 */
export type CreateChecklistSection = Omit<ChecklistSection, 'id' | 'created_at'>;
export type CreateChecklistTask = Omit<ChecklistTask, 'id' | 'created_at' | 'updated_at'>;

/**
 * Filter types for queries
 */
export interface ChecklistFilter {
  wedding_id: string;
  section_id?: string;
  assigned_to?: TaskAssignment;
  status?: TaskStatus;
  completed?: boolean;
  due_date_from?: Date;
  due_date_to?: Date;
}

/**
 * Task statistics for dashboard
 */
export interface TaskStatistics {
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  overdue: number;
  completion_percentage: number;
}

/**
 * Section with task statistics
 */
export interface ChecklistSectionWithStats extends ChecklistSection {
  task_count: number;
  completed_count: number;
  completion_percentage: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Color coding for task urgency based on due date
 */
export const TASK_URGENCY_COLORS = {
  RED: '#EF4444', // Past due or due within 0 days
  ORANGE: '#F59E0B', // Due within 30 days
  GREEN: '#10B981', // Due in 30+ days
} as const;

/**
 * Maximum file size for Excel uploads (10MB)
 */
export const MAX_EXCEL_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Maximum number of tasks per checklist (for performance)
 */
export const MAX_TASKS_PER_CHECKLIST = 200;

/**
 * Default number of upcoming tasks to show in widgets
 */
export const DEFAULT_UPCOMING_TASKS_LIMIT = {
  ADMIN: 5,
  PLANNER: 3, // Per wedding
} as const;

/**
 * Excel column headers for import/export
 */
export const EXCEL_COLUMNS = {
  SECTION: 'Section',
  TITLE: 'Title',
  DESCRIPTION: 'Description',
  ASSIGNED_TO: 'Assigned To',
  DUE_DATE: 'Due Date',
  STATUS: 'Status',
  COMPLETED: 'Completed',
} as const;
