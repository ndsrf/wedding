/**
 * Wedding Planner - Guest Timeline API Route
 *
 * GET /api/planner/weddings/:id/guests/:guestId/timeline - Get tracking events for a family
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

interface RouteParams {
  params: Promise<{ id: string; guestId: string }>;
}

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
 * GET /api/planner/weddings/:id/guests/:guestId/timeline
 * Get all tracking events for a family, ordered by most recent first
 */
export async function GET(_request: NextRequest, context: RouteParams) {
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

    const { id: weddingId, guestId: familyId } = await context.params;

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

    // Verify the family belongs to this wedding
    const family = await prisma.family.findFirst({
      where: {
        id: familyId,
        wedding_id: weddingId,
      },
      select: {
        id: true,
        name: true,
        created_at: true,
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
        wedding_id: weddingId,
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
    const eventsWithFamily = events.map((event: {
      id: string;
      family_id: string;
      event_type: string;
      channel: string | null;
      metadata: unknown;
      admin_triggered: boolean;
      timestamp: Date;
    }) => ({
      ...event,
      family_name: family.name,
    }));

    // Add a synthetic "GUEST_CREATED" event at the beginning (last chronologically)
    const guestCreatedEvent = {
      id: `created-${family.id}`,
      family_id: family.id,
      event_type: 'GUEST_CREATED',
      channel: null,
      metadata: null,
      admin_triggered: true,
      timestamp: family.created_at,
      family_name: family.name,
    };

    // Add the created event to the end (it's the oldest event)
    eventsWithFamily.push(guestCreatedEvent);

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
