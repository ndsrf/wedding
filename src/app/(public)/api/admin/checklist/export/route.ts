/**
 * Wedding Admin - Checklist Export API Route
 *
 * GET /api/admin/checklist/export - Export checklist to Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/auth/middleware';
import { exportWeddingChecklist } from '@/lib/checklist/excel-export';
import type { ExportOptions } from '@/types/checklist';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { prisma } from '@/lib/db/prisma';

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
 * GET /api/admin/checklist/export
 * Export wedding checklist to Excel or CSV format
 *
 * Query parameters:
 * - wedding_id: string (required) - Wedding ID
 * - format: 'xlsx' | 'csv' (default: 'xlsx')
 * - includeCompleted: 'true' | 'false' (default: 'true')
 */
export async function GET(request: NextRequest) {
  try {
    // Require planner or wedding_admin role
    const user = await requireAnyRole(['planner', 'wedding_admin']);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('wedding_id');
    const format = (searchParams.get('format') || 'xlsx') as 'xlsx' | 'csv';
    const includeCompleted = searchParams.get('includeCompleted') !== 'false';

    // Validate wedding_id
    if (!weddingId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'wedding_id query parameter is required',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

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

    // Export checklist
    const exportOptions: ExportOptions = {
      format,
      includeCompleted,
    };

    const result = await exportWeddingChecklist(weddingId, exportOptions);

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
        message: 'Failed to export checklist',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
