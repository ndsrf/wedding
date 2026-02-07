/**
 * Wedding Planner - Deleted Weddings API
 *
 * GET /api/planner/weddings/deleted - List planner's deleted weddings (paginated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type {
  APIResponse,
  ListPlannerWeddingsResponse,
} from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { WeddingStatus } from '@prisma/client';

// Validation schema for query parameters
const listDeletedWeddingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

/**
 * GET /api/planner/weddings/deleted
 * List all deleted weddings for the authenticated planner
 */
export async function GET(request: NextRequest) {
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = listDeletedWeddingsQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
    });

    const { page, limit } = queryParams;
    const skip = (page - 1) * limit;

    // Build where clause - only deleted weddings
    const where = {
      planner_id: user.planner_id,
      status: WeddingStatus.DELETED,
    };

    // Get total count for pagination
    const total = await prisma.wedding.count({ where });

    // Fetch weddings with pagination and include stats
    const weddings = await prisma.wedding.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        deleted_at: 'desc', // Most recently deleted first
      },
      include: {
        theme: true,
        planner: true,
        _count: {
          select: {
            families: true,
            wedding_admins: true,
          },
        },
      },
    });

    // Calculate stats for each wedding
    const weddingsWithStats = await Promise.all(
      weddings.map(async (wedding) => {
        // Get RSVP stats
        const families = await prisma.family.findMany({
          where: { wedding_id: wedding.id },
          include: {
            members: true,
            gifts: true,
          },
        });

        const guest_count = families.reduce((sum, family) => sum + family.members.length, 0);
        const rsvp_count = families.filter((family) =>
          family.members.some((member) => member.attending !== null)
        ).length;
        const rsvp_completion_percentage =
          families.length > 0 ? Math.round((rsvp_count / families.length) * 100) : 0;
                const attending_count = families.reduce(
                  (sum, family) => sum + family.members.filter((member) => member.attending === true).length,
                  0
                );        const payment_received_count = families.filter((family) =>
          family.gifts.some((gift) => gift.status === 'RECEIVED' || gift.status === 'CONFIRMED')
        ).length;

        return {
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
          gift_iban: wedding.gift_iban,
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
          save_the_date_enabled: wedding.save_the_date_enabled,
          whatsapp_mode: wedding.whatsapp_mode,
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
          guest_count,
          rsvp_count,
          rsvp_completion_percentage,
          attending_count,
          payment_received_count,
        };
      })
    );

    const response: ListPlannerWeddingsResponse = {
      success: true,
      data: {
        items: weddingsWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
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
          message: 'Planner role required',
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
          message: 'Invalid query parameters',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error fetching deleted weddings:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch deleted weddings',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
