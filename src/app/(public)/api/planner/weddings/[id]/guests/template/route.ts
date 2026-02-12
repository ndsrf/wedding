/**
 * Wedding Planner - Guest Import Template API Route
 *
 * GET /api/planner/weddings/:id/guests/template - Download Excel template for guest import
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { generateTemplate } from '@/lib/excel/templates';
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
 * GET /api/planner/weddings/:id/guests/template
 * Generate and download Excel template for guest import
 *
 * Query parameters:
 * - includeExamples: 'true' | 'false' (default: 'true')
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

    // Get wedding details for default language
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: {
        default_language: true,
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeExamples = searchParams.get('includeExamples') !== 'false';

    // Generate template
    const result = generateTemplate({
      language: wedding.default_language,
      includeExamples,
    });

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
    console.error('Template generation error:', error);

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
        message: 'Failed to generate template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
