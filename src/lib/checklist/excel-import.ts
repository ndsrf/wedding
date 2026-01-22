/**
 * Excel Import Service for Checklists
 *
 * Validates and imports checklist data from Excel files.
 * Performs comprehensive validation and merges data with existing checklists.
 */

import * as XLSX from 'xlsx';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import type {
  ChecklistImportRow,
  ValidationError,
  ValidationWarning,
  ImportResult,
  ImportPreview,
  TaskAssignment,
  TaskStatus,
  RelativeDateFormat,
} from '@/types/checklist';
import {
  convertRelativeDateToAbsolute,
  isValidRelativeDateFormat,
} from './date-converter';

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Zod schema for validating TaskAssignment enum
 */
const taskAssignmentSchema = z.enum(['WEDDING_PLANNER', 'COUPLE', 'OTHER'], {
  errorMap: () => ({ message: 'Must be WEDDING_PLANNER, COUPLE, or OTHER' }),
});

/**
 * Zod schema for validating TaskStatus enum
 */
const taskStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED'], {
  errorMap: () => ({ message: 'Must be PENDING, IN_PROGRESS, or COMPLETED' }),
});

/**
 * Zod schema for validating a single import row
 */
const importRowSchema = z.object({
  section: z
    .string()
    .min(1, 'Section name is required')
    .max(100, 'Section name too long (max 100 characters)'),
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(200, 'Task title too long (max 200 characters)'),
  description: z
    .string()
    .max(2000, 'Description too long (max 2000 characters)')
    .nullable()
    .optional(),
  assigned_to: taskAssignmentSchema,
  due_date: z.string().min(1, 'Due date is required'),
  status: taskStatusSchema,
  completed: z.boolean().default(false).optional(),
});

// ============================================================================
// EXCEL PARSING
// ============================================================================

/**
 * Parse Excel file buffer into structured data
 * Strips all formulas and macros for security
 *
 * @param buffer - Excel file buffer
 * @returns Array of parsed import rows
 */
export function parseChecklistExcel(buffer: Buffer): ChecklistImportRow[] {
  // Read workbook without formulas (values only) and macros disabled
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellFormula: false, // Strip formulas, keep only values
    cellStyles: false, // Don't parse styles
    cellDates: true, // Parse dates
  });

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file is empty or has no sheets');
  }

  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with header row
  const rawData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false, // Get formatted strings instead of raw values
    defval: '', // Default value for empty cells
  }) as (string | number | boolean | null)[][];

  if (rawData.length === 0) {
    throw new Error('Excel sheet is empty');
  }

  // Expected headers
  const expectedHeaders = [
    'Section',
    'Title',
    'Description',
    'Assigned To',
    'Due Date',
    'Status',
    'Completed',
  ];

  // Validate headers
  const headerRow = rawData[0];
  if (!headerRow || headerRow.length === 0) {
    throw new Error('Excel file missing header row');
  }

  // Normalize headers for comparison (trim and case-insensitive)
  const normalizedHeaders = headerRow.map((h) =>
    String(h || '').trim().toLowerCase()
  );
  const expectedNormalized = expectedHeaders.map((h) => h.toLowerCase());

  // Check if all expected headers are present
  for (const expectedHeader of expectedNormalized) {
    if (!normalizedHeaders.includes(expectedHeader)) {
      throw new Error(
        `Missing required column: ${expectedHeaders[expectedNormalized.indexOf(expectedHeader)]}`
      );
    }
  }

  // Get column indices
  const getColumnIndex = (headerName: string): number => {
    const normalized = headerName.toLowerCase();
    const index = normalizedHeaders.indexOf(normalized);
    if (index === -1) {
      throw new Error(`Column not found: ${headerName}`);
    }
    return index;
  };

  const sectionCol = getColumnIndex('Section');
  const titleCol = getColumnIndex('Title');
  const descriptionCol = getColumnIndex('Description');
  const assignedToCol = getColumnIndex('Assigned To');
  const dueDateCol = getColumnIndex('Due Date');
  const statusCol = getColumnIndex('Status');
  const completedCol = getColumnIndex('Completed');

  // Skip header row and parse data rows
  const dataRows = rawData.slice(1);
  const rows: ChecklistImportRow[] = [];

  for (const row of dataRows) {
    // Skip completely empty rows
    if (!row || row.length === 0 || row.every((cell) => !cell)) {
      continue;
    }

    // Extract and clean cell values
    const section = String(row[sectionCol] || '').trim();
    const title = String(row[titleCol] || '').trim();
    const description = row[descriptionCol]
      ? String(row[descriptionCol]).trim()
      : null;
    const assigned_to = String(row[assignedToCol] || '').trim().toUpperCase();
    const due_date = String(row[dueDateCol] || '').trim();
    const status = String(row[statusCol] || '').trim().toUpperCase();
    const completed = parseBoolean(row[completedCol]);

    // Skip rows with no title (likely empty)
    if (!title) {
      continue;
    }

    rows.push({
      section,
      title,
      description: description || null,
      assigned_to,
      due_date,
      status,
      completed,
    });
  }

  return rows;
}

/**
 * Parse boolean values from Excel cells
 */
function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    return normalized === 'true' || normalized === 'yes' || normalized === '1';
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return false;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate import data with Zod schemas
 *
 * @param rows - Parsed import rows
 * @param weddingDate - Wedding date for validating relative dates
 * @returns Validation errors and warnings
 */
export function validateImportData(
  rows: ChecklistImportRow[],
  weddingDate: Date
): { errors: ValidationError[]; warnings: ValidationWarning[]; validatedRows: ChecklistImportRow[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const validatedRows: ChecklistImportRow[] = [];

  // Validate wedding date
  if (!(weddingDate instanceof Date) || isNaN(weddingDate.getTime())) {
    errors.push({
      row: 0,
      field: 'Wedding Date',
      message: 'Invalid wedding date provided',
    });
    return { errors, warnings, validatedRows };
  }

  // Check row count limit
  if (rows.length === 0) {
    errors.push({
      row: 0,
      message: 'No tasks found in Excel file',
    });
    return { errors, warnings, validatedRows };
  }

  if (rows.length > 200) {
    errors.push({
      row: 0,
      message: `Too many tasks (${rows.length}). Maximum allowed is 200.`,
    });
    return { errors, warnings, validatedRows };
  }

  // Track sections and task combinations for duplicate detection
  const taskKeys = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header and 0-index

    try {
      // Validate row with Zod schema
      const validated = importRowSchema.parse(row);

      // Additional validation for due date format
      const dueDateStr = validated.due_date.trim();
      const isRelative = isValidRelativeDateFormat(dueDateStr);
      const isAbsolute = /^\d{4}-\d{2}-\d{2}$/.test(dueDateStr);

      if (!isRelative && !isAbsolute) {
        errors.push({
          row: rowNum,
          field: 'Due Date',
          message: `Invalid due date format: "${dueDateStr}". Must be either relative (WEDDING_DATE-90) or absolute (YYYY-MM-DD)`,
          value: dueDateStr,
        });
        return;
      }

      // If absolute date, validate it's a valid date
      if (isAbsolute) {
        const parsedDate = new Date(dueDateStr);
        if (isNaN(parsedDate.getTime())) {
          errors.push({
            row: rowNum,
            field: 'Due Date',
            message: `Invalid date: "${dueDateStr}"`,
            value: dueDateStr,
          });
          return;
        }
      }

      // Check for duplicate tasks (same section + title)
      const taskKey = `${validated.section.toLowerCase()}|||${validated.title.toLowerCase()}`;
      if (taskKeys.has(taskKey)) {
        warnings.push({
          row: rowNum,
          message: `Duplicate task: "${validated.title}" in section "${validated.section}". Only the first occurrence will be processed.`,
        });
        return; // Skip duplicate
      }
      taskKeys.add(taskKey);

      // Warn if completed is true but status is not COMPLETED
      if (validated.completed && validated.status !== 'COMPLETED') {
        warnings.push({
          row: rowNum,
          message: `Task is marked as completed but status is "${validated.status}". Status will be set to COMPLETED.`,
        });
        validated.status = 'COMPLETED';
      }

      // Warn if status is COMPLETED but completed is false
      if (validated.status === 'COMPLETED' && !validated.completed) {
        warnings.push({
          row: rowNum,
          message: `Task status is COMPLETED but completed checkbox is false. Completed will be set to true.`,
        });
        validated.completed = true;
      }

      validatedRows.push(validated as ChecklistImportRow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          const fieldValue = err.path.length > 0 && err.path[0] in row
            ? row[err.path[0] as keyof ChecklistImportRow]
            : undefined;

          errors.push({
            row: rowNum,
            field: err.path.join('.'),
            message: err.message,
            value: fieldValue,
          });
        });
      } else {
        errors.push({
          row: rowNum,
          message: error instanceof Error ? error.message : 'Unknown validation error',
        });
      }
    }
  });

  return { errors, warnings, validatedRows };
}

// ============================================================================
// PREVIEW IMPORT
// ============================================================================

/**
 * Preview import changes before actually importing
 * Shows which tasks will be created vs updated
 *
 * @param wedding_id - Wedding ID to import into
 * @param rows - Validated import rows
 * @returns Preview of import changes
 */
export async function previewImport(
  wedding_id: string,
  rows: ChecklistImportRow[]
): Promise<ImportPreview> {
  // Fetch existing tasks and sections
  const existingSections = await prisma.checklistSection.findMany({
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
      },
    },
  });

  // Build a map of existing tasks by section+title
  const existingTaskMap = new Map<string, boolean>();
  existingSections.forEach((section) => {
    section.tasks.forEach((task) => {
      const key = `${section.name.toLowerCase()}|||${task.title.toLowerCase()}`;
      existingTaskMap.set(key, true);
    });
  });

  // Also check for orphaned tasks (tasks without sections)
  const orphanedTasks = await prisma.checklistTask.findMany({
    where: {
      wedding_id,
      template_id: null,
      section_id: null,
    },
  });

  orphanedTasks.forEach((task) => {
    const key = `|||${task.title.toLowerCase()}`;
    existingTaskMap.set(key, true);
  });

  // Count new vs updated tasks
  let newTasks = 0;
  let updatedTasks = 0;
  const sections = new Set<string>();
  const warnings: ValidationWarning[] = [];

  rows.forEach((row) => {
    const taskKey = `${row.section.toLowerCase()}|||${row.title.toLowerCase()}`;
    sections.add(row.section);

    if (existingTaskMap.has(taskKey)) {
      updatedTasks++;
    } else {
      newTasks++;
    }
  });

  return {
    newTasks,
    updatedTasks,
    sections: Array.from(sections).sort(),
    rows,
    warnings,
  };
}

// ============================================================================
// IMPORT CHECKLIST
// ============================================================================

/**
 * Import checklist from Excel data
 * Merges with existing checklist by matching Section+Title
 * Creates new tasks and updates existing ones
 *
 * @param wedding_id - Wedding ID to import into
 * @param rows - Validated import rows
 * @param weddingDate - Wedding date for relative date conversion
 * @returns Import result with counts and any errors
 */
export async function importChecklist(
  wedding_id: string,
  rows: ChecklistImportRow[],
  weddingDate: Date
): Promise<ImportResult> {
  try {
    // Use transaction for atomic import
    const result = await prisma.$transaction(async (tx) => {
      let tasksCreated = 0;
      let tasksUpdated = 0;
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Fetch existing sections
      const existingSections = await tx.checklistSection.findMany({
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
          },
        },
      });

      // Build section map (name -> section)
      const sectionMap = new Map(
        existingSections.map((s) => [s.name.toLowerCase(), s])
      );

      // Build task map (section_id+title -> task) for matching
      const taskMap = new Map<string, { id: string }>();
      existingSections.forEach((section) => {
        section.tasks.forEach((task) => {
          const key = `${section.id}|||${task.title.toLowerCase()}`;
          taskMap.set(key, task);
        });
      });

      // Get the maximum order number across all tasks
      const maxOrderTask = await tx.checklistTask.findFirst({
        where: {
          wedding_id,
          template_id: null,
        },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      let nextOrder = (maxOrderTask?.order ?? 0) + 1;

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Row number for error reporting (header + 0-index offset)

        try {
          // Get or create section
          let section = sectionMap.get(row.section.toLowerCase());
          if (!section) {
            // Create new section
            const maxSectionOrder = await tx.checklistSection.findFirst({
              where: {
                wedding_id,
                template_id: null,
              },
              orderBy: { order: 'desc' },
              select: { order: true },
            });

            section = await tx.checklistSection.create({
              data: {
                wedding_id,
                name: row.section,
                order: (maxSectionOrder?.order ?? 0) + 1,
                template_id: null,
              },
              include: {
                tasks: true,
              },
            });

            sectionMap.set(row.section.toLowerCase(), section);
          }

          // Convert due date
          let dueDate: Date | null = null;
          if (row.due_date) {
            if (isValidRelativeDateFormat(row.due_date)) {
              // Convert relative date to absolute
              dueDate = convertRelativeDateToAbsolute(row.due_date as RelativeDateFormat, weddingDate);
            } else {
              // Parse absolute date
              dueDate = new Date(row.due_date);
            }
          }

          // Check if task already exists (match by section + title)
          const taskKey = `${section.id}|||${row.title.toLowerCase()}`;
          const existingTask = taskMap.get(taskKey);

          if (existingTask) {
            // Update existing task
            await tx.checklistTask.update({
              where: { id: existingTask.id },
              data: {
                description: row.description,
                assigned_to: row.assigned_to as TaskAssignment,
                due_date: dueDate,
                status: row.status as TaskStatus,
                completed: row.completed || row.status === 'COMPLETED',
                completed_at:
                  row.completed || row.status === 'COMPLETED'
                    ? new Date()
                    : null,
              },
            });
            tasksUpdated++;
          } else {
            // Create new task
            await tx.checklistTask.create({
              data: {
                wedding_id,
                section_id: section.id,
                title: row.title,
                description: row.description,
                assigned_to: row.assigned_to as TaskAssignment,
                due_date: dueDate,
                status: row.status as TaskStatus,
                completed: row.completed || row.status === 'COMPLETED',
                completed_at:
                  row.completed || row.status === 'COMPLETED'
                    ? new Date()
                    : null,
                order: nextOrder++,
                template_id: null,
              },
            });
            tasksCreated++;
          }
        } catch (error) {
          errors.push({
            row: rowNum,
            message:
              error instanceof Error ? error.message : 'Failed to import task',
          });
        }
      }

      return { tasksCreated, tasksUpdated, errors, warnings };
    });

    return {
      success: result.errors.length === 0,
      tasksCreated: result.tasksCreated,
      tasksUpdated: result.tasksUpdated,
      errors: result.errors,
      warnings: result.warnings,
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      tasksCreated: 0,
      tasksUpdated: 0,
      errors: [
        {
          row: 0,
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      ],
      warnings: [],
    };
  }
}
