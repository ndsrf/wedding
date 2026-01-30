/**
 * Wedding Admin - Guest Timeline API Route
 *
 * GET /api/admin/guests/:id/timeline - Get tracking events for a family
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma/prisma';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/guests/:id/timeline
 * Get all tracking events for a family, ordered by most recent first
 */
export async function GET(_request: NextRequest, context: RouteParams) {
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

    const { id: familyId } = await context.params;

    // Verify the family belongs to this wedding
    const family = await prisma.family.findFirst({
      where: {
        id: familyId,
        wedding_id: user.wedding_id,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!family) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Family not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Fetch all tracking events for this family, ordered by most recent first
    const events = await prisma.trackingEvent.findMany({
      where: {
        family_id: familyId,
        wedding_id: user.wedding_id,
      },
      orderBy: {
        timestamp: 'desc',
      },
      select: {
        id: true,
        family_id: true,
        event_type: true,
        channel: true,
        metadata: true,
        admin_triggered: true,
        timestamp: true,
      },
    });

    // Add family name to each event for convenience
    const eventsWithFamily = events.map((event) => ({
      ...event,
      family_name: family.name,
    }));

    const response: APIResponse = {
      success: true,
      data: {
        events: eventsWithFamily,
        family: {
          id: family.id,
          name: family.name,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
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
          message: 'Insufficient permissions',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    console.error('Error fetching timeline:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch timeline',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
