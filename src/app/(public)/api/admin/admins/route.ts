/**
 * Wedding Admin - Admins List API Route
 *
 * GET /api/admin/admins - List all WeddingAdmins for the current wedding
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

/**
 * GET /api/admin/admins
 * Returns list of WeddingAdmin { id, name, email } for the current user's wedding
 */
export async function GET() {
  try {
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

    const admins = await prisma.weddingAdmin.findMany({
      where: { wedding_id: user.wedding_id },
      select: { id: true, name: true, email: true },
      orderBy: { created_at: 'asc' },
    });

    const response: APIResponse = {
      success: true,
      data: admins,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
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
          message: 'Wedding admin role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    console.error('Error fetching admins:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch admins',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
