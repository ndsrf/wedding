/**
 * Wedding Admin - Wedding Details API Route
 *
 * GET /api/admin/wedding - Get wedding details for admin
 * PATCH /api/admin/wedding - Update wedding configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type {
  APIResponse,
  GetWeddingDetailsResponse,
  UpdateWeddingConfigResponse,
} from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

// Validation schema for updating wedding config
const updateWeddingConfigSchema = z.object({
  rsvp_cutoff_date: z.string().datetime().optional(),
  payment_tracking_mode: z.enum(['AUTOMATED', 'MANUAL']).optional(),
  allow_guest_additions: z.boolean().optional(),
  dress_code: z.string().nullable().optional(),
  additional_info: z.string().nullable().optional(),

  // RSVP Configuration - Transportation question
  transportation_question_enabled: z.boolean().optional(),
  transportation_question_text: z.string().nullable().optional(),

  // RSVP Configuration - Dietary restrictions
  dietary_restrictions_enabled: z.boolean().optional(),

  // RSVP Configuration - Extra Yes/No questions (up to 3)
  extra_question_1_enabled: z.boolean().optional(),
  extra_question_1_text: z.string().nullable().optional(),
  extra_question_2_enabled: z.boolean().optional(),
  extra_question_2_text: z.string().nullable().optional(),
  extra_question_3_enabled: z.boolean().optional(),
  extra_question_3_text: z.string().nullable().optional(),

  // RSVP Configuration - Extra mandatory info fields (up to 3)
  extra_info_1_enabled: z.boolean().optional(),
  extra_info_1_label: z.string().nullable().optional(),
  extra_info_2_enabled: z.boolean().optional(),
  extra_info_2_label: z.string().nullable().optional(),
  extra_info_3_enabled: z.boolean().optional(),
  extra_info_3_label: z.string().nullable().optional(),
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

    // Check if wedding is deleted - treat as not found for admins
    if (wedding.status === 'DELETED') {
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
      is_disabled: wedding.is_disabled,
      disabled_at: wedding.disabled_at,
      disabled_by: wedding.disabled_by,
      deleted_at: wedding.deleted_at,
      deleted_by: wedding.deleted_by,
      created_at: wedding.created_at,
      created_by: wedding.created_by,
      updated_at: wedding.updated_at,
      updated_by: wedding.updated_by,
      // RSVP Configuration fields
      transportation_question_enabled: wedding.transportation_question_enabled,
      transportation_question_text: wedding.transportation_question_text,
      dietary_restrictions_enabled: wedding.dietary_restrictions_enabled,
      extra_question_1_enabled: wedding.extra_question_1_enabled,
      extra_question_1_text: wedding.extra_question_1_text,
      extra_question_2_enabled: wedding.extra_question_2_enabled,
      extra_question_2_text: wedding.extra_question_2_text,
      extra_question_3_enabled: wedding.extra_question_3_enabled,
      extra_question_3_text: wedding.extra_question_3_text,
      extra_info_1_enabled: wedding.extra_info_1_enabled,
      extra_info_1_label: wedding.extra_info_1_label,
      extra_info_2_enabled: wedding.extra_info_2_enabled,
      extra_info_2_label: wedding.extra_info_2_label,
      extra_info_3_enabled: wedding.extra_info_3_enabled,
      extra_info_3_label: wedding.extra_info_3_label,
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

    // Build update data object
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
    };

    // Basic config fields
    if (validatedData.rsvp_cutoff_date) {
      updateData.rsvp_cutoff_date = new Date(validatedData.rsvp_cutoff_date);
    }
    if (validatedData.payment_tracking_mode) {
      updateData.payment_tracking_mode = validatedData.payment_tracking_mode;
    }
    if (validatedData.allow_guest_additions !== undefined) {
      updateData.allow_guest_additions = validatedData.allow_guest_additions;
    }
    if (validatedData.dress_code !== undefined) {
      updateData.dress_code = validatedData.dress_code;
    }
    if (validatedData.additional_info !== undefined) {
      updateData.additional_info = validatedData.additional_info;
    }

    // Transportation question
    if (validatedData.transportation_question_enabled !== undefined) {
      updateData.transportation_question_enabled = validatedData.transportation_question_enabled;
    }
    if (validatedData.transportation_question_text !== undefined) {
      updateData.transportation_question_text = validatedData.transportation_question_text;
    }

    // Dietary restrictions
    if (validatedData.dietary_restrictions_enabled !== undefined) {
      updateData.dietary_restrictions_enabled = validatedData.dietary_restrictions_enabled;
    }

    // Extra Yes/No questions
    if (validatedData.extra_question_1_enabled !== undefined) {
      updateData.extra_question_1_enabled = validatedData.extra_question_1_enabled;
    }
    if (validatedData.extra_question_1_text !== undefined) {
      updateData.extra_question_1_text = validatedData.extra_question_1_text;
    }
    if (validatedData.extra_question_2_enabled !== undefined) {
      updateData.extra_question_2_enabled = validatedData.extra_question_2_enabled;
    }
    if (validatedData.extra_question_2_text !== undefined) {
      updateData.extra_question_2_text = validatedData.extra_question_2_text;
    }
    if (validatedData.extra_question_3_enabled !== undefined) {
      updateData.extra_question_3_enabled = validatedData.extra_question_3_enabled;
    }
    if (validatedData.extra_question_3_text !== undefined) {
      updateData.extra_question_3_text = validatedData.extra_question_3_text;
    }

    // Extra mandatory info fields
    if (validatedData.extra_info_1_enabled !== undefined) {
      updateData.extra_info_1_enabled = validatedData.extra_info_1_enabled;
    }
    if (validatedData.extra_info_1_label !== undefined) {
      updateData.extra_info_1_label = validatedData.extra_info_1_label;
    }
    if (validatedData.extra_info_2_enabled !== undefined) {
      updateData.extra_info_2_enabled = validatedData.extra_info_2_enabled;
    }
    if (validatedData.extra_info_2_label !== undefined) {
      updateData.extra_info_2_label = validatedData.extra_info_2_label;
    }
    if (validatedData.extra_info_3_enabled !== undefined) {
      updateData.extra_info_3_enabled = validatedData.extra_info_3_enabled;
    }
    if (validatedData.extra_info_3_label !== undefined) {
      updateData.extra_info_3_label = validatedData.extra_info_3_label;
    }

    // Update wedding
    const wedding = await prisma.wedding.update({
      where: { id: user.wedding_id },
      data: updateData,
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
