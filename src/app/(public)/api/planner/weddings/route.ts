/**
 * Wedding Planner - Weddings API Routes
 *
 * GET /api/planner/weddings - List planner's weddings (paginated)
 * POST /api/planner/weddings - Create a new wedding
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { seedWeddingTemplatesFromPlanner } from '@/lib/templates/planner-seed';
import { copyTemplateToWedding } from '@/lib/checklist/template';
import { parseInitials } from '@/lib/short-url';
import type {
  APIResponse,
  ListPlannerWeddingsResponse,
  CreateWeddingResponse,
  CreateWeddingRequest,
} from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { Language, LocationType, PaymentMode, WeddingStatus } from '@prisma/client';

// Validation schema for creating a wedding
const createWeddingSchema = z.object({
  couple_names: z.string().min(1, 'Couple names are required'),
  wedding_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  wedding_time: z.string().min(1, 'Wedding time is required'),
  location: z.string().optional(),
  main_event_location_id: z.string().uuid().optional().nullable(),
  itinerary: z.array(z.object({
    location_id: z.string().uuid(),
    item_type: z.nativeEnum(LocationType).default('EVENT'),
    date_time: z.string(),
    notes: z.string().optional(),
    order: z.number().int(),
  })).optional(),
  rsvp_cutoff_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  dress_code: z.string().optional(),
  additional_info: z.string().optional(),
  // Accept any value for theme_id - can be UUID (custom themes), slug (system themes), or empty
  theme_id: z.any()
    .transform(val => (val === '' || val === null || val === undefined) ? undefined : val)
    .refine(
      (val) => {
        if (val === undefined) return true;
        if (typeof val !== 'string') return false;
        // Accept either UUID format OR any non-empty string (for system theme slugs)
        return val.length > 0;
      },
      { message: 'Invalid theme ID' }
    ),
  payment_tracking_mode: z.nativeEnum(PaymentMode),
  allow_guest_additions: z.boolean(),
  default_language: z.nativeEnum(Language),
});

// Validation schema for query parameters
const listWeddingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  status: z.string().optional(),
});

/**
 * GET /api/planner/weddings
 * List all weddings for the authenticated planner
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
    const queryParams = listWeddingsQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      status: searchParams.get('status') || undefined,
    });

    const { page, limit, status } = queryParams;
    const skip = (page - 1) * limit;

    // Build where clause - exclude deleted weddings by default
    const where: { planner_id: string; status?: WeddingStatus | { not: WeddingStatus } } = {
      planner_id: user.planner_id,
      status: { not: WeddingStatus.DELETED },
    };

    // If status is explicitly provided, use that instead
    if (status) {
      where.status = status.toUpperCase() as WeddingStatus;
    }

    // Get total count for pagination
    const total = await prisma.wedding.count({ where });

    // Fetch weddings with pagination and include stats
    const weddings = await prisma.wedding.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        wedding_date: 'asc',
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
          main_event_location_id: wedding.main_event_location_id,
          rsvp_cutoff_date: wedding.rsvp_cutoff_date,
          dress_code: wedding.dress_code,
          additional_info: wedding.additional_info,
          payment_tracking_mode: wedding.payment_tracking_mode,
          gift_iban: wedding.gift_iban,
          allow_guest_additions: wedding.allow_guest_additions,
          default_language: wedding.default_language,
          wedding_country: wedding.wedding_country,
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
          short_url_initials: wedding.short_url_initials,
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
          wedding_day_theme_id: (wedding as unknown as { wedding_day_theme_id?: string | null }).wedding_day_theme_id ?? null,
          wedding_day_invitation_template_id: (wedding as unknown as { wedding_day_invitation_template_id?: string | null }).wedding_day_invitation_template_id ?? null,
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
    console.error('Error fetching weddings:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch weddings',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/planner/weddings
 * Create a new wedding
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData: CreateWeddingRequest = createWeddingSchema.parse(body);

    // Validate theme_id if provided
    if (validatedData.theme_id) {
      const theme = await prisma.theme.findUnique({
        where: { id: validatedData.theme_id },
      });

      if (!theme) {
        const response: APIResponse = {
          success: false,
          error: {
            code: API_ERROR_CODES.NOT_FOUND,
            message: 'Theme not found',
          },
        };
        return NextResponse.json(response, { status: 404 });
      }

      // Check if theme belongs to this planner or is a system theme
      if (!theme.is_system_theme && theme.planner_id !== user.planner_id) {
        const response: APIResponse = {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'You do not have access to this theme',
          },
        };
        return NextResponse.json(response, { status: 403 });
      }
    }

    // Validate dates
    const weddingDate = new Date(validatedData.wedding_date);
    const rsvpCutoffDate = new Date(validatedData.rsvp_cutoff_date);

    if (rsvpCutoffDate >= weddingDate) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'RSVP cutoff date must be before the wedding date',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create the wedding
    const wedding = await prisma.wedding.create({
      data: {
        planner_id: user.planner_id,
        couple_names: validatedData.couple_names,
        wedding_date: weddingDate,
        wedding_time: validatedData.wedding_time,
        location: validatedData.location,
        main_event_location_id: validatedData.main_event_location_id ?? null,
        rsvp_cutoff_date: rsvpCutoffDate,
        dress_code: validatedData.dress_code,
        additional_info: validatedData.additional_info,
        theme_id: validatedData.theme_id,
        payment_tracking_mode: validatedData.payment_tracking_mode,
        allow_guest_additions: validatedData.allow_guest_additions,
        default_language: validatedData.default_language,
        short_url_initials: parseInitials(validatedData.couple_names),
        save_the_date_enabled: true,
        status: 'ACTIVE',
        created_by: user.id,
      },
    });

    // Create itinerary items if provided
    if (validatedData.itinerary && validatedData.itinerary.length > 0) {
      await prisma.itineraryItem.createMany({
        data: validatedData.itinerary.map((item) => ({
          wedding_id: wedding.id,
          location_id: item.location_id,
          item_type: item.item_type ?? 'EVENT',
          date_time: new Date(item.date_time),
          notes: item.notes,
          order: item.order,
        })),
      });
    }

    // Copy planner's default templates to the new wedding
    try {
      await seedWeddingTemplatesFromPlanner(wedding.id, user.planner_id);
    } catch (error) {
      console.error('Failed to seed templates for wedding:', error);
      // Don't fail the whole operation if template seeding fails
    }

    // Copy planner's checklist template to the new wedding
    // This automatically converts relative dates (e.g., "WEDDING_DATE-90") to absolute dates
    try {
      // Only copy if wedding has a valid wedding_date
      if (wedding.wedding_date && wedding.wedding_date instanceof Date) {
        const tasksCreated = await copyTemplateToWedding(user.planner_id, wedding.id);
        if (tasksCreated > 0) {
          console.log(`Successfully copied ${tasksCreated} tasks from template to wedding ${wedding.id}`);
        }
      }
    } catch (error) {
      // Log error but don't fail wedding creation
      console.error('Failed to copy checklist template to wedding:', error);
      // This is not critical - planner can still manually create checklist if needed
    }

    const response: CreateWeddingResponse = {
      success: true,
      data: wedding,
    };

    return NextResponse.json(response, { status: 201 });
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
          message: 'Invalid request data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error creating wedding:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to create wedding',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
