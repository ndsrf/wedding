/**
 * Excel Export Service for Checklist Feature
 *
 * Generates Excel files from checklist templates and wedding checklists.
 * Follows patterns from existing Excel export service and handles proper
 * formatting for dates, enums, and rich text content.
 */

import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db/prisma';
import type { ExportOptions, ExportResult } from '@/types/checklist';
import type { TaskAssignment, TaskStatus } from '@prisma/client';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Strip rich text formatting from descriptions
 * Removes HTML tags and converts to plain text
 *
 * @param html - HTML string to convert
 * @returns Plain text string
 */
function stripRichText(html: string | null): string {
  if (!html) return '';

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Trim excessive whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Format TaskAssignment enum for export
 *
 * @param assignment - TaskAssignment enum value
 * @returns Human-readable string
 */
function formatAssignment(assignment: TaskAssignment): string {
  const mapping: Record<TaskAssignment, string> = {
    WEDDING_PLANNER: 'Wedding Planner',
    COUPLE: 'Couple',
    OTHER: 'Other',
  };

  return mapping[assignment] || assignment;
}

/**
 * Format TaskStatus enum for export
 *
 * @param status - TaskStatus enum value
 * @returns Human-readable string
 */
function formatStatus(status: TaskStatus): string {
  const mapping: Record<TaskStatus, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
  };

  return mapping[status] || status;
}

/**
 * Format date for export
 * For absolute dates: YYYY-MM-DD format
 * For relative dates: Keep as-is (e.g., "WEDDING_DATE-90")
 *
 * @param date - Date object or relative date string
 * @param relativeDateStr - Optional relative date string (for templates)
 * @returns Formatted date string
 */
function formatDate(date: Date | null, relativeDateStr?: string | null): string {
  // For template export, use relative dates if available
  if (relativeDateStr) {
    return relativeDateStr;
  }

  // For absolute dates
  if (date && date instanceof Date && !isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  return '';
}

/**
 * Validate file size
 * Ensures generated buffer is under 5MB limit
 *
 * @param buffer - Buffer to check
 * @throws Error if buffer exceeds 5MB
 */
function validateFileSize(buffer: Buffer): void {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes

  if (buffer.length > MAX_SIZE) {
    throw new Error(
      `Generated file size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit`
    );
  }
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export checklist template for a wedding planner
 *
 * Generates Excel file with all template tasks including relative dates.
 * Tasks are organized by section with proper formatting.
 *
 * @param planner_id - Wedding planner's ID
 * @param options - Export options (format, inclusion filters)
 * @returns Buffer containing the exported Excel file
 */
export async function exportChecklistTemplate(
  planner_id: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const { format = 'xlsx', includeCompleted = true, relativeDates = true } = options;

  // Fetch template with sections and tasks
  const template = await prisma.checklistTemplate.findUnique({
    where: { planner_id },
    include: {
      sections: {
        where: { template_id: { not: null } },
        include: {
          tasks: {
            where: { template_id: { not: null } },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!template) {
    throw new Error('Template not found for this planner');
  }

  // Prepare export rows
  const exportRows: (string | number)[][] = [];

  // Add header row
  exportRows.push([
    'Section',
    'Title',
    'Description',
    'Assigned To',
    'Due Date',
    'Status',
    'Completed',
  ]);

  // Add data rows
  let taskCount = 0;
  for (const section of template.sections) {
    for (const task of section.tasks) {
      // Skip completed tasks if includeCompleted is false
      if (!includeCompleted && task.completed) {
        continue;
      }

      // Limit to 200 tasks maximum
      if (taskCount >= 200) {
        console.warn('Export limited to 200 tasks for performance');
        break;
      }

      exportRows.push([
        section.name,
        task.title,
        stripRichText(task.description),
        formatAssignment(task.assigned_to),
        relativeDates
          ? formatDate(null, task.due_date_relative)
          : formatDate(task.due_date),
        formatStatus(task.status),
        task.completed ? 'Yes' : 'No',
      ]);

      taskCount++;
    }
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(exportRows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Section
    { wch: 30 }, // Title
    { wch: 50 }, // Description
    { wch: 20 }, // Assigned To
    { wch: 20 }, // Due Date
    { wch: 15 }, // Status
    { wch: 12 }, // Completed
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Checklist Template');

  // Generate file based on format
  const timestamp = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const buffer = Buffer.from(csv, 'utf-8');
    validateFileSize(buffer);

    return {
      buffer,
      filename: `checklist-template-${timestamp}.csv`,
      mimeType: 'text/csv',
    };
  } else {
    const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    validateFileSize(buffer);

    return {
      buffer,
      filename: `checklist-template-${timestamp}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

/**
 * Export wedding checklist
 *
 * Generates Excel file with all wedding checklist tasks including absolute dates.
 * Tasks are organized by section with proper formatting.
 *
 * @param wedding_id - Wedding ID
 * @param options - Export options (format, inclusion filters)
 * @returns Buffer containing the exported Excel file
 */
export async function exportWeddingChecklist(
  wedding_id: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const { format = 'xlsx', includeCompleted = true } = options;

  // Fetch wedding to get couple names for filename
  const wedding = await prisma.wedding.findUnique({
    where: { id: wedding_id },
    select: { couple_names: true },
  });

  if (!wedding) {
    throw new Error('Wedding not found');
  }

  // Fetch checklist sections and tasks
  const sections = await prisma.checklistSection.findMany({
    where: {
      wedding_id,
      template_id: null,
    },
    include: {
      tasks: {
        where: {
          wedding_id,
          template_id: null,
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  // Prepare export rows
  const exportRows: (string | number)[][] = [];

  // Add header row
  exportRows.push([
    'Section',
    'Title',
    'Description',
    'Assigned To',
    'Due Date',
    'Status',
    'Completed',
  ]);

  // Add data rows
  let taskCount = 0;
  for (const section of sections) {
    for (const task of section.tasks) {
      // Skip completed tasks if includeCompleted is false
      if (!includeCompleted && task.completed) {
        continue;
      }

      // Limit to 200 tasks maximum
      if (taskCount >= 200) {
        console.warn('Export limited to 200 tasks for performance');
        break;
      }

      exportRows.push([
        section.name,
        task.title,
        stripRichText(task.description),
        formatAssignment(task.assigned_to),
        formatDate(task.due_date),
        formatStatus(task.status),
        task.completed ? 'Yes' : 'No',
      ]);

      taskCount++;
    }
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(exportRows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Section
    { wch: 30 }, // Title
    { wch: 50 }, // Description
    { wch: 20 }, // Assigned To
    { wch: 20 }, // Due Date
    { wch: 15 }, // Status
    { wch: 12 }, // Completed
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Wedding Checklist');

  // Generate file based on format
  const timestamp = new Date().toISOString().split('T')[0];
  const coupleNameSlug = wedding.couple_names
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const buffer = Buffer.from(csv, 'utf-8');
    validateFileSize(buffer);

    return {
      buffer,
      filename: `wedding-checklist-${coupleNameSlug}-${timestamp}.csv`,
      mimeType: 'text/csv',
    };
  } else {
    const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    validateFileSize(buffer);

    return {
      buffer,
      filename: `wedding-checklist-${coupleNameSlug}-${timestamp}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

/**
 * Generate a blank checklist Excel template for download
 *
 * Creates an empty Excel file with proper column headers and formatting
 * that users can fill in and import later. Includes example rows to guide users.
 *
 * @returns Buffer containing the Excel template
 */
export async function generateChecklistExcelTemplate(): Promise<ExportResult> {
  // Prepare template with headers and example rows
  const exportRows: (string | number)[][] = [];

  // Add header row
  exportRows.push([
    'Section',
    'Title',
    'Description',
    'Assigned To',
    'Due Date',
    'Status',
    'Completed',
  ]);

  // Add example rows to guide users
  exportRows.push([
    'Pre-Wedding',
    'Book venue',
    'Research and book wedding venue',
    'Couple',
    'WEDDING_DATE-180',
    'Pending',
    'No',
  ]);

  exportRows.push([
    'Pre-Wedding',
    'Send invitations',
    'Design and send wedding invitations',
    'Wedding Planner',
    'WEDDING_DATE-60',
    'Pending',
    'No',
  ]);

  exportRows.push([
    'Pre-Wedding',
    'Confirm catering',
    'Finalize menu and guest count with caterer',
    'Couple',
    'WEDDING_DATE-30',
    'Pending',
    'No',
  ]);

  exportRows.push([
    'Day Of',
    'Setup ceremony',
    'Setup chairs, decorations, and sound system',
    'Wedding Planner',
    'WEDDING_DATE',
    'Pending',
    'No',
  ]);

  exportRows.push([
    'Post-Wedding',
    'Send thank you cards',
    'Write and send thank you notes to all guests',
    'Couple',
    'WEDDING_DATE+14',
    'Pending',
    'No',
  ]);

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(exportRows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Section
    { wch: 30 }, // Title
    { wch: 50 }, // Description
    { wch: 20 }, // Assigned To
    { wch: 20 }, // Due Date
    { wch: 15 }, // Status
    { wch: 12 }, // Completed
  ];

  // Add instructions as a separate sheet
  const instructionsRows = [
    ['Wedding Checklist Import Template'],
    [''],
    ['Instructions:'],
    ['1. Fill in the checklist tasks in the "Template" sheet'],
    ['2. Section: Name of the checklist section (e.g., "Pre-Wedding", "Day Of", "Post-Wedding")'],
    ['3. Title: Brief title of the task (required)'],
    ['4. Description: Detailed description of the task (optional)'],
    ['5. Assigned To: Must be one of: "Wedding Planner", "Couple", or "Other"'],
    ['6. Due Date: Can be absolute (YYYY-MM-DD) or relative (WEDDING_DATE±N days)'],
    ['   - Examples: "2024-06-15", "WEDDING_DATE-90", "WEDDING_DATE+7"'],
    ['7. Status: Must be one of: "Pending", "In Progress", or "Completed"'],
    ['8. Completed: "Yes" or "No"'],
    [''],
    ['Notes:'],
    ['- Remove the example rows before importing'],
    ['- Maximum 200 tasks per checklist'],
    ['- Import file must be under 10MB'],
  ];

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsRows);
  instructionsSheet['!cols'] = [{ wch: 80 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  // Generate file
  const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  validateFileSize(buffer);

  return {
    buffer,
    filename: 'wedding-checklist-template.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
