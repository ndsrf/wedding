/**
 * Wedding Admin - Wedding Details API Route
 *
 * GET /api/admin/wedding - Get wedding details for admin
 * PATCH /api/admin/wedding - Update wedding configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/src/lib/auth/middleware';
import type {
  APIResponse,
  GetWeddingDetailsResponse,
  UpdateWeddingConfigResponse,
} from '@/src/types/api';
import { API_ERROR_CODES } from '@/src/types/api';

// Validation schema for updating wedding config
const updateWeddingConfigSchema = z.object({
  rsvp_cutoff_date: z.string().datetime().optional(),
  payment_tracking_mode: z.enum(['AUTOMATED', 'MANUAL']).optional(),
  allow_guest_additions: z.boolean().optional(),
});

/**
 * GET /api/admin/wedding
 * Get wedding details for admin including stats
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

    // Fetch wedding with related data
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      include: {
        planner: {
          select: {
            name: true,
          },
        },
        wedding_admins: true,
        families: {
          include: {
            members: true,
            gifts: true,
          },
        },
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

    // Calculate stats
    const totalGuests = wedding.families.reduce(
      (sum, family) => sum + family.members.length,
      0
    );

    const rsvpSubmittedFamilies = wedding.families.filter((family) =>
      family.members.some((member) => member.attending !== null)
    );

    const rsvpCount = rsvpSubmittedFamilies.length;
    const rsvpCompletionPercentage =
      wedding.families.length > 0
        ? Math.round((rsvpCount / wedding.families.length) * 100)
        : 0;

    const attendingCount = wedding.families.reduce(
      (sum, family) =>
        sum + family.members.filter((m) => m.attending === true).length,
      0
    );

    const paymentReceivedCount = wedding.families.filter((family) =>
      family.gifts.some(
        (gift) => gift.status === 'RECEIVED' || gift.status === 'CONFIRMED'
      )
    ).length;

    const weddingDetails = {
      id: wedding.id,
      planner_id: wedding.planner_id,
      theme_id: wedding.theme_id,
      couple_names: wedding.couple_names,
      wedding_date: wedding.wedding_date,
      wedding_time: wedding.wedding_time,
      location: wedding.location,
      rsvp_cutoff_date: wedding.rsvp_cutoff_date,
      dress_code: wedding.dress_code,
      additional_info: wedding.additional_info,
      payment_tracking_mode: wedding.payment_tracking_mode,
      allow_guest_additions: wedding.allow_guest_additions,
      default_language: wedding.default_language,
      status: wedding.status,
      created_at: wedding.created_at,
      created_by: wedding.created_by,
      updated_at: wedding.updated_at,
      updated_by: wedding.updated_by,
      // Stats
      guest_count: totalGuests,
      rsvp_count: rsvpCount,
      rsvp_completion_percentage: rsvpCompletionPercentage,
      attending_count: attendingCount,
      payment_received_count: paymentReceivedCount,
      // Additional details for admin view
      planner_name: wedding.planner.name,
      admin_count: wedding.wedding_admins.length,
    };

    const response: GetWeddingDetailsResponse = {
      success: true,
      data: weddingDetails,
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
    console.error('Error fetching wedding details:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch wedding details',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PATCH /api/admin/wedding
 * Update wedding configuration
 */
export async function PATCH(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateWeddingConfigSchema.parse(body);

    // Update wedding
    const wedding = await prisma.wedding.update({
      where: { id: user.wedding_id },
      data: {
        ...(validatedData.rsvp_cutoff_date && {
          rsvp_cutoff_date: new Date(validatedData.rsvp_cutoff_date),
        }),
        ...(validatedData.payment_tracking_mode && {
          payment_tracking_mode: validatedData.payment_tracking_mode,
        }),
        ...(validatedData.allow_guest_additions !== undefined && {
          allow_guest_additions: validatedData.allow_guest_additions,
        }),
        updated_by: user.id,
      },
    });

    const response: UpdateWeddingConfigResponse = {
      success: true,
      data: wedding,
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

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid request data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error updating wedding config:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update wedding configuration',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
