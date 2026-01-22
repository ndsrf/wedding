/**
 * Checklist Template Export API Route
 *
 * GET /api/planner/checklist-template/export - Export template to Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { exportChecklistTemplate } from '@/lib/checklist/excel-export';
import type { ExportOptions } from '@/types/checklist';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const exportQuerySchema = z.object({
  format: z.enum(['xlsx', 'csv']).default('xlsx'),
  includeCompleted: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .pipe(z.boolean())
    .default('true'),
  relativeDates: z
    .string()
    .transform((val) => val !== 'false' && val !== '0')
    .pipe(z.boolean())
    .default('true'),
});

// ============================================================================
// GET /api/planner/checklist-template/export
// ============================================================================

/**
 * GET /api/planner/checklist-template/export
 * Export the authenticated planner's checklist template as Excel/CSV file
 */
export async function GET(request: NextRequest) {
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = exportQuerySchema.parse({
      format: searchParams.get('format') || 'xlsx',
      includeCompleted: searchParams.get('includeCompleted') || 'true',
      relativeDates: searchParams.get('relativeDates') || 'true',
    });

    const exportOptions: ExportOptions = {
      format: queryParams.format,
      includeCompleted: queryParams.includeCompleted,
      relativeDates: queryParams.relativeDates,
    };

    // Export template
    const exportResult = await exportChecklistTemplate(user.planner_id, exportOptions);

    // Return file as download
    return new NextResponse(new Uint8Array(exportResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': exportResult.mimeType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Content-Length': exportResult.buffer.length.toString(),
      },
    });
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
          message: 'Invalid query parameters',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle not found errors
    if (errorMessage.includes('not found')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Template not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Handle file size errors
    if (errorMessage.includes('exceeds') && errorMessage.includes('MB')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: errorMessage,
        },
      };
      return NextResponse.json(response, { status: 413 });
    }

    // Handle unexpected errors
    console.error('Error exporting template:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Failed to export template',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
