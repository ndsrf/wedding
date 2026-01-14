/**
 * Wedding Admin - Guest Import Template API Route
 *
 * GET /api/admin/guests/template - Download Excel template for guest import
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/src/lib/auth/middleware';
import { generateTemplate } from '@/src/lib/excel/templates';
import type { APIResponse } from '@/src/types/api';
import { API_ERROR_CODES } from '@/src/types/api';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/admin/guests/template
 * Generate and download Excel template for guest import
 *
 * Query parameters:
 * - includeExamples: 'true' | 'false' (default: 'true')
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

    // Get wedding details for default language
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
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
        message: 'Failed to generate template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
