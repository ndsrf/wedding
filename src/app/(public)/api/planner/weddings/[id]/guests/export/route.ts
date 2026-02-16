/**
 * Wedding Planner - Guest Export API Route
 *
 * GET /api/planner/weddings/:id/guests/export - Export guest list to Excel or CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { exportGuestData, exportGuestDataSimplified, exportGuestDataForImport } from '@/lib/excel/export';
import type { ExportFormat } from '@/lib/excel/export';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { prisma } from '@/lib/db/prisma';

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
 * GET /api/planner/weddings/:id/guests/export
 * Export guest data to Excel or CSV format
 *
 * Query parameters:
 * - format: 'xlsx' | 'csv' (default: 'xlsx')
 * - simplified: 'true' | 'false' (default: 'false')
 * - forImport: 'true' | 'false' (default: 'false') - export in import-compatible format
 * - includePayment: 'true' | 'false' (default: 'true')
 * - includeRsvp: 'true' | 'false' (default: 'true')
 */
export async function GET(
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'xlsx') as ExportFormat;
    const simplified = searchParams.get('simplified') === 'true';
    const forImport = searchParams.get('forImport') === 'true';
    const includePayment = searchParams.get('includePayment') !== 'false';
    const includeRsvp = searchParams.get('includeRsvp') !== 'false';

    // Validate format
    if (!['xlsx', 'csv'].includes(format)) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid format. Must be xlsx or csv',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Export guest data
    let result;
    if (forImport) {
      result = await exportGuestDataForImport(weddingId);
    } else if (simplified) {
      result = await exportGuestDataSimplified(weddingId);
    } else {
      result = await exportGuestData(weddingId, {
        format,
        includePaymentInfo: includePayment,
        includeRsvpStatus: includeRsvp,
      });
    }

    // Return file as download
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Export error:', error);

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
        message: 'Failed to export guest list',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
