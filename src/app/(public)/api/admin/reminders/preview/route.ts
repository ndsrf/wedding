/**
 * Wedding Admin - Preview Reminder Recipients API Route
 *
 * GET /api/admin/reminders/preview - Preview families that would receive reminders
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse, ReminderPreviewResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

/**
 * GET /api/admin/reminders/preview
 * Preview families that would receive reminders (no RSVP response)
 */
export async function GET() {
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

    // Find families without RSVP response
    const familiesWithoutRsvp = await prisma.family.findMany({
      where: {
        wedding_id: user.wedding_id,
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
      (family) => family.members.every((member) => member.attending === null)
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
          message: 'Wedding admin role required',
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
