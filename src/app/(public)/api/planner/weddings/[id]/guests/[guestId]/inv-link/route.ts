/**
 * Wedding Planner - Guest Invitation Link API Route
 *
 * GET /api/planner/weddings/:id/guests/:guestId/inv-link - Get the /inv/ short URL for a family
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { getShortUrlPath } from '@/lib/short-url';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

interface RouteParams {
  params: Promise<{ id: string; guestId: string }>;
}

/**
 * GET /api/planner/weddings/:id/guests/:guestId/inv-link
 * Returns the /inv/ short URL path for the given family, creating
 * initials / short code if they don't exist yet.
 */
export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('planner');

    if (!user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const { id: weddingId, guestId } = await context.params;

    // Verify the planner owns the wedding and the family belongs to it
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { planner_id: true },
    });

    if (!wedding) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Wedding not found' },
      };
      return NextResponse.json(response, { status: 404 });
    }

    if (wedding.planner_id !== user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'You do not have access to this wedding' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const family = await prisma.family.findUnique({
      where: { id: guestId },
      select: { wedding_id: true },
    });

    if (!family || family.wedding_id !== weddingId) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Guest not found' },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const path = await getShortUrlPath(guestId);

    const response: APIResponse = {
      success: true,
      data: { path },
    };
    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' },
      };
      return NextResponse.json(response, { status: 401 });
    }
    if (msg.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner role required' },
      };
      return NextResponse.json(response, { status: 403 });
    }
    console.error('Error fetching inv link:', error);
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch invitation link' },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
