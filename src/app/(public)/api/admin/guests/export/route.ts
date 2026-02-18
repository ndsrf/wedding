/**
 * Wedding Admin - Guest Export API Route
 *
 * GET /api/admin/guests/export - Export guest list to Excel or CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { exportGuestData, exportGuestDataSimplified } from '@/lib/excel/export';
import type { ExportFormat } from '@/lib/excel/export';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

/**
 * GET /api/admin/guests/export
 * Export guest data to Excel or CSV format
 *
 * Query parameters:
 * - format: 'xlsx' | 'csv' (default: 'xlsx')
 * - simplified: 'true' | 'false' (default: 'false') - summary view without member details
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and require wedding_admin role
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Wedding ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'xlsx') as ExportFormat;
    const simplified = searchParams.get('simplified') === 'true';

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
    const result = simplified
      ? await exportGuestDataSimplified(user.wedding_id)
      : await exportGuestData(user.wedding_id, { format });

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
          message: 'Wedding admin access required',
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
