/**
 * Wedding Planner - Guest Import API Route
 *
 * POST /api/planner/weddings/:id/guests/import - Upload and import guest list from Excel file
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { importGuestList } from '@/lib/excel/import';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { prisma } from '@/lib/db/prisma';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Helper to validate planner access to wedding
 */
async function validatePlannerAccess(plannerId: string, weddingId: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { planner_id: true },
  });

  if (!wedding) {
    return { valid: false, error: 'Wedding not found', status: 404 };
  }

  if (wedding.planner_id !== plannerId) {
    return { valid: false, error: 'You do not have access to this wedding', status: 403 };
  }

  return { valid: true };
}

/**
 * POST /api/planner/weddings/:id/guests/import
 * Import guest list from Excel file
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: weddingId } = await params;

    // Validate planner access to wedding
    const accessCheck = await validatePlannerAccess(user.planner_id, weddingId);
    if (!accessCheck.valid) {
      const response: APIResponse = {
        success: false,
        error: {
          code: accessCheck.status === 404 ? API_ERROR_CODES.NOT_FOUND : API_ERROR_CODES.FORBIDDEN,
          message: accessCheck.error!,
        },
      };
      return NextResponse.json(response, { status: accessCheck.status });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

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
        payment_tracking_mode: true,
        default_language: true,
        wedding_country: true,
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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Import guest list
    const result = await importGuestList(
      wedding.id,
      buffer,
      wedding.payment_tracking_mode,
      wedding.default_language,
      wedding.wedding_country
    );

    if (!result.success) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: result.message,
          details: {
            errors: result.errors,
            warnings: result.warnings,
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: APIResponse = {
      success: true,
      data: {
        familiesCreated: result.familiesCreated,
        membersCreated: result.membersCreated,
        warnings: result.warnings,
        message: result.message,
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
          message: 'Planner access required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Generic error
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to import guest list',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
