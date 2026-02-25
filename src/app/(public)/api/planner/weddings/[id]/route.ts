/**
 * Wedding Planner - Single Wedding API Routes
 *
 * GET /api/planner/weddings/:id - Get wedding details
 * PATCH /api/planner/weddings/:id - Update wedding
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { reRenderWeddingTemplates } from '@/lib/invitation-template/re-render';
import { revalidateWeddingRSVPPages } from '@/lib/cache/revalidate-rsvp';
import { invalidateWeddingPageCache } from '@/lib/cache/rsvp-page';
import type {
  APIResponse,
  GetWeddingResponse,
  UpdateWeddingResponse,
  UpdateWeddingRequest,
} from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { Language, LocationType, PaymentMode, WhatsAppMode } from '@prisma/client';

// Validation schema for updating a wedding
const updateWeddingSchema = z
  .object({
    couple_names: z.string().min(1, 'Couple names are required').optional(),
    wedding_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
    wedding_time: z.string().min(1, 'Wedding time is required').optional(),
    location: z.string().optional(),
    main_event_location_id: z.string().uuid().optional().nullable(),
    itinerary: z.array(z.object({
      id: z.string().optional(),
      location_id: z.string().uuid(),
      item_type: z.nativeEnum(LocationType).default('EVENT'),
      date_time: z.string(),
      notes: z.string().optional(),
      order: z.number().int(),
    })).optional(),
    rsvp_cutoff_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
    dress_code: z.string().optional(),
    additional_info: z.string().optional(),
    theme_id: z.string().min(1, 'Invalid theme ID').nullable().optional(),
    payment_tracking_mode: z.nativeEnum(PaymentMode).optional(),
    allow_guest_additions: z.boolean().optional(),
    default_language: z.nativeEnum(Language).optional(),
    whatsapp_mode: z.nativeEnum(WhatsAppMode).optional(),
  })
  .partial();

/**
 * GET /api/planner/weddings/:id
 * Get details for a specific wedding
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

    // Fetch wedding with relations
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        theme: true,
        planner: true,
        wedding_admins: true,
        itinerary_items: {
          include: { location: true },
          orderBy: { order: 'asc' },
        },
        main_event_location: true,
        _count: {
          select: {
            families: true,
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

    // Check if wedding belongs to this planner
    if (wedding.planner_id !== user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'You do not have access to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Calculate stats
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
    );
    const payment_received_count = families.filter((family) =>
      family.gifts.some((gift) => gift.status === 'RECEIVED' || gift.status === 'CONFIRMED')
    ).length;

    const weddingWithStats = {
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
      wedding_admins: wedding.wedding_admins,
      itinerary_items: wedding.itinerary_items,
      main_event_location: wedding.main_event_location,
    };

    const response: GetWeddingResponse = {
      success: true,
      data: weddingWithStats,
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
    console.error('Error fetching wedding:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch wedding',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PATCH /api/planner/weddings/:id
 * Update a wedding
 */
export async function PATCH(
  request: NextRequest,
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

    // Check if wedding exists and belongs to this planner
    const existingWedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
    });

    if (!existingWedding) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Wedding not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    if (existingWedding.planner_id !== user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'You do not have access to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData: UpdateWeddingRequest = updateWeddingSchema.parse(body);

    // Validate theme_id if provided
    if (validatedData.theme_id !== undefined) {
      if (validatedData.theme_id !== null) {
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
    }

    // Validate dates if provided
    if (validatedData.wedding_date || validatedData.rsvp_cutoff_date) {
      const weddingDate = validatedData.wedding_date
        ? new Date(validatedData.wedding_date)
        : existingWedding.wedding_date;
      const rsvpCutoffDate = validatedData.rsvp_cutoff_date
        ? new Date(validatedData.rsvp_cutoff_date)
        : existingWedding.rsvp_cutoff_date;

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
    }

    // Build update data - Convert date strings to Date objects for Prisma
    const { wedding_date, rsvp_cutoff_date, itinerary, ...restData } = validatedData;

    const updateData: Partial<{
      couple_names: string;
      wedding_date: Date;
      wedding_time: string;
      location: string;
      main_event_location_id: string | null;
      rsvp_cutoff_date: Date;
      dress_code: string;
      additional_info: string;
      theme_id: string | null;
      payment_tracking_mode: PaymentMode;
      allow_guest_additions: boolean;
      default_language: Language;
      whatsapp_mode: WhatsAppMode;
      updated_by: string;
    }> = {
      ...restData,
      updated_by: user.id,
    };

    // Convert date strings to Date objects
    if (wedding_date) {
      updateData.wedding_date = new Date(wedding_date);
    }
    if (rsvp_cutoff_date) {
      updateData.rsvp_cutoff_date = new Date(rsvp_cutoff_date);
    }

    // Update the wedding
    const wedding = await prisma.wedding.update({
      where: { id: weddingId },
      data: updateData,
    });

    // Replace itinerary if provided
    if (itinerary !== undefined) {
      await prisma.itineraryItem.deleteMany({ where: { wedding_id: weddingId } });
      if (itinerary.length > 0) {
        await prisma.itineraryItem.createMany({
          data: itinerary.map((item) => ({
            wedding_id: weddingId,
            location_id: item.location_id,
            item_type: item.item_type ?? 'EVENT',
            date_time: new Date(item.date_time),
            notes: item.notes,
            order: item.order,
          })),
        });
      }
    }

    // If theme changed, re-render all invitation templates and invalidate caches
    if (validatedData.theme_id !== undefined && validatedData.theme_id !== existingWedding.theme_id) {
      await reRenderWeddingTemplates(weddingId);
      invalidateWeddingPageCache(weddingId);
      void revalidateWeddingRSVPPages(weddingId);
    }

    const response: UpdateWeddingResponse = {
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
    console.error('Error updating wedding:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update wedding',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
