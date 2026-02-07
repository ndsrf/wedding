/**
 * Wedding Admin - Checklist Import API Route
 *
 * POST /api/admin/checklist/import - Upload and import checklist from Excel file
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth/middleware';
import {
  parseChecklistExcel,
  validateImportData,
  importChecklist,
} from '@/lib/checklist/excel-import';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { prisma } from '@/lib/db/prisma';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Verify user has access to the specified wedding
 */
async function verifyWeddingAccess(
  userId: string,
  weddingId: string,
  userRole: string
): Promise<boolean> {
  // Wedding admins must match the wedding_id
  if (userRole === 'wedding_admin') {
    const admin = await prisma.weddingAdmin.findFirst({
      where: {
        id: userId,
        wedding_id: weddingId,
      },
    });
    return !!admin;
  }

  // Planners must be the planner for this wedding
  if (userRole === 'planner') {
    const planner = await prisma.weddingPlanner.findFirst({
      where: { id: userId },
    });

    if (!planner) return false;

    const wedding = await prisma.wedding.findFirst({
      where: {
        id: weddingId,
        planner_id: planner.id,
      },
    });

    return !!wedding;
  }

  return false;
}

/**
 * POST /api/admin/checklist/import
 * Import checklist from Excel file
 */
export async function POST(request: NextRequest) {
  try {
    // Require planner or wedding_admin role
    const user = await requireAnyRole(['planner', 'wedding_admin']);

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const weddingId = formData.get('wedding_id') as string | null;

    // Validate wedding_id
    if (!weddingId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'wedding_id is required in form data',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Verify user has access to this wedding
    const hasAccess = await verifyWeddingAccess(user.id, weddingId, user.role);
    if (!hasAccess) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'No access to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Validate file is provided
    if (!file) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'No file provided',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!validTypes.includes(file.type)) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid file type. Please upload an Excel file (.xlsx)',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get wedding details
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: {
        id: true,
        wedding_date: true,
      },
    });

    if (!wedding) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Wedding not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Validate wedding has a date
    if (!wedding.wedding_date) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Wedding date is required for checklist import',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

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
          message: 'Failed to parse Excel file',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate import data
    const validation = validateImportData(parsedRows, wedding.wedding_date);

    if (validation.errors.length > 0) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation errors found in import data',
          details: {
            errors: validation.errors,
            warnings: validation.warnings,
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Import checklist
    const result = await importChecklist(
      weddingId,
      validation.validatedRows,
      wedding.wedding_date
    );

    if (!result.success) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_ERROR,
          message: 'Import failed',
          details: {
            errors: result.errors,
            warnings: result.warnings,
          },
        },
      };
      return NextResponse.json(response, { status: 500 });
    }

    const response: APIResponse = {
      success: true,
      data: {
        tasksCreated: result.tasksCreated,
        tasksUpdated: result.tasksUpdated,
        warnings: result.warnings,
        message: `Successfully imported ${result.tasksCreated} new tasks and updated ${result.tasksUpdated} existing tasks`,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Import error:', error);

    // Handle authentication/authorization errors
    if (error instanceof Error && error.message.startsWith('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (error instanceof Error && error.message.startsWith('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner or wedding admin access required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Generic error
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to import checklist',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
