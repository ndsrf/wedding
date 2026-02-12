/**
 * Wedding Planner - Preview Reminder Recipients API Route
 *
 * GET /api/planner/weddings/:id/reminders/preview - Preview families that would receive reminders
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse, ReminderPreviewResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

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
 * GET /api/planner/weddings/:id/reminders/preview
 * Preview families that would receive reminders (no RSVP response)
 */
export async function GET(
  _request: NextRequest,
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

    // Find families without RSVP response
    const familiesWithoutRsvp = await prisma.family.findMany({
      where: {
        wedding_id: weddingId,
      },
      include: {
        members: {
          select: {
            attending: true,
          },
        },
      },
    });

    // Filter families where no member has responded
    const eligibleFamilies = familiesWithoutRsvp.filter(
      (family) => family.members.length > 0 && family.members.every((member) => member.attending === null)
    );

    const response: ReminderPreviewResponse = {
      success: true,
      data: {
        eligible_families: eligibleFamilies.length,
        families: eligibleFamilies.map((family) => ({
          id: family.id,
          name: family.name,
          preferred_language: family.preferred_language,
          channel_preference: family.channel_preference,
        })),
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
          message: 'Planner role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle unexpected errors
    console.error('Error fetching reminder preview:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch reminder preview',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
