/**
 * Checklist Template Import API Route
 *
 * POST /api/planner/checklist-template/import - Import template from Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { saveTemplate } from '@/lib/checklist/template';
import {
  parseChecklistExcel,
  validateImportData,
} from '@/lib/checklist/excel-import';
import type { CreateTemplateSectionData } from '@/types/checklist';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { MAX_EXCEL_FILE_SIZE } from '@/types/checklist';
import { TaskAssignment } from '@prisma/client';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const importFormSchema = z.object({
  wedding_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), 'Invalid wedding date'),
});

// ============================================================================
// POST /api/planner/checklist-template/import
// ============================================================================

/**
 * POST /api/planner/checklist-template/import
 * Import checklist template from Excel file
 *
 * Expects multipart/form-data with:
 * - file: Excel file (.xlsx or .csv)
 * - wedding_date: Wedding date for validating relative dates (YYYY-MM-DD)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and require planner role
    const user = await requireRole('planner');

    if (!user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const weddingDateStr = formData.get('wedding_date') as string | null;

    // Validate file is provided
    if (!file) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'File is required',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate wedding date is provided
    if (!weddingDateStr) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Wedding date is required for date validation',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !['xlsx', 'xls', 'csv'].includes(fileExtension)) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid file type. Only Excel (.xlsx, .xls) and CSV files are supported.',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_EXCEL_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      const maxSizeMB = (MAX_EXCEL_FILE_SIZE / 1024 / 1024).toFixed(0);
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: `File size (${sizeMB}MB) exceeds maximum allowed size of ${maxSizeMB}MB`,
        },
      };
      return NextResponse.json(response, { status: 413 });
    }

    // Validate wedding date format
    const formValidation = importFormSchema.safeParse({
      wedding_date: weddingDateStr,
    });

    if (!formValidation.success) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid wedding date format',
          details: formValidation.error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const weddingDate = formValidation.data.wedding_date;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel file
    let parsedRows;
    try {
      parsedRows = parseChecklistExcel(buffer);
    } catch (error) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: error instanceof Error ? error.message : 'Failed to parse Excel file',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate parsed data
    const validation = validateImportData(parsedRows, weddingDate);

    if (validation.errors.length > 0) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: {
            errors: validation.errors,
            warnings: validation.warnings,
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Transform validated rows into template structure
    const sectionMap = new Map<string, CreateTemplateSectionData>();
    let sectionOrder = 0;

    for (const row of validation.validatedRows) {
      const sectionKey = row.section.toLowerCase();

      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, {
          name: row.section,
          order: sectionOrder++,
          tasks: [],
        });
      }

      const section = sectionMap.get(sectionKey)!;
      section.tasks.push({
        title: row.title,
        description: row.description,
        assigned_to: row.assigned_to as TaskAssignment,
        due_date_relative: row.due_date,
        order: section.tasks.length,
      });
    }

    const sections = Array.from(sectionMap.values());

    // Validate total task count
    const totalTasks = sections.reduce((sum, section) => sum + section.tasks.length, 0);
    if (totalTasks > 200) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: `Too many tasks (${totalTasks}). Maximum allowed is 200.`,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Save template
    const template = await saveTemplate(user.planner_id, {
      planner_id: user.planner_id,
      sections,
    });

    const response: APIResponse = {
      success: true,
      data: {
        template,
        summary: {
          sectionsCreated: sections.length,
          tasksCreated: totalTasks,
          warnings: validation.warnings,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    // Handle authentication errors
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (errorMessage.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid import data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error importing template:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to import template',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
