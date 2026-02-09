/**
 * Wedding Admin - Guests API Route
 *
 * GET /api/admin/guests - List all families with filters and pagination
 * POST /api/admin/guests - Create new family
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse, ListGuestsResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import type { Prisma } from '@prisma/client';
import { createFamily } from '@/lib/guests/crud';
import { createFamilySchema } from '@/lib/guests/validation';

// Validation schema for query parameters
const listGuestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  rsvp_status: z.enum(['pending', 'submitted']).optional(),
  attendance: z.enum(['yes', 'no', 'partial']).optional(),
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).optional(),
  payment_status: z.enum(['PENDING', 'RECEIVED', 'CONFIRMED']).optional(),
  invited_by_admin_id: z.string().uuid().optional(),
  search: z.string().optional(),
});

/**
 * GET /api/admin/guests
 * List all families with filters and pagination
 */
export async function GET(request: NextRequest) {
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = listGuestsQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      rsvp_status: searchParams.get('rsvp_status') || undefined,
      attendance: searchParams.get('attendance') || undefined,
      channel: searchParams.get('channel') || undefined,
      payment_status: searchParams.get('payment_status') || undefined,
      invited_by_admin_id: searchParams.get('invited_by_admin_id') || undefined,
      search: searchParams.get('search') || undefined,
    });

    const { page, limit, rsvp_status, attendance, channel, payment_status, invited_by_admin_id, search } =
      queryParams;
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: Prisma.FamilyWhereInput = {
      wedding_id: user.wedding_id,
    };

    // Search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Channel filter
    if (channel) {
      whereClause.channel_preference = channel;
    }

    // Invited By filter
    if (invited_by_admin_id) {
      whereClause.invited_by_admin_id = invited_by_admin_id;
    }

    // Use Prisma relation filters instead of in-memory filtering for better performance
    // RSVP status filter - use relation filters
    if (rsvp_status === 'submitted') {
      whereClause.members = {
        some: {
          attending: { not: null },
        },
      };
    } else if (rsvp_status === 'pending') {
      whereClause.members = {
        every: {
          attending: null,
        },
      };
    }

    // Attendance filter - use relation filters
    if (attendance === 'yes') {
      whereClause.members = {
        some: {
          attending: true,
        },
      };
    } else if (attendance === 'no') {
      whereClause.members = {
        some: {
          attending: false,
        },
        none: {
          attending: true,
        },
      };
    } else if (attendance === 'partial') {
      whereClause.AND = [
        {
          members: {
            some: {
              attending: true,
            },
          },
        },
        {
          members: {
            some: {
              OR: [
                { attending: false },
                { attending: null },
              ],
            },
          },
        },
      ];
    }

    // Payment status filter - use relation filters
    if (payment_status) {
      whereClause.gifts = {
        some: {
          status: payment_status,
        },
      };
    }

    // Get total count for pagination
    const total = await prisma.family.count({ where: whereClause });

    // Fetch families with members
    const families = await prisma.family.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        members: true,
        gifts: {
          select: {
            status: true,
            amount: true,
          },
        },
        tracking_events: {
          where: {
            event_type: 'INVITATION_SENT',
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    // Fetch all admins once for name resolution
    const weddingAdmins = await prisma.weddingAdmin.findMany({
      where: { wedding_id: user.wedding_id },
      select: { id: true, name: true, email: true },
    });
    const adminMap = new Map(weddingAdmins.map((a) => [a.id, a]));

    // Transform response to include RSVP status and payment status
    const familiesWithStatus = families.map((family) => {
      const hasRsvp = family.members.some((m) => m.attending !== null);
      const attendingMembers = family.members.filter((m) => m.attending === true);
      const latestGift = family.gifts[0];
      const invitationSent = family.tracking_events.length > 0;

      const invitedByAdmin = family.invited_by_admin_id ? adminMap.get(family.invited_by_admin_id) : null;

      return {
        id: family.id,
        wedding_id: family.wedding_id,
        name: family.name,
        email: family.email,
        phone: family.phone,
        whatsapp_number: family.whatsapp_number,
        magic_token: family.magic_token,
        reference_code: family.reference_code,
        channel_preference: family.channel_preference,
        preferred_language: family.preferred_language,
        invited_by_admin_id: family.invited_by_admin_id,
        invited_by_admin_name: invitedByAdmin ? (invitedByAdmin.name || invitedByAdmin.email) : null,
        private_notes: family.private_notes,
        save_the_date_sent: family.save_the_date_sent,
        created_at: family.created_at,
        // RSVP Question Answers
        transportation_answer: family.transportation_answer,
        extra_question_1_answer: family.extra_question_1_answer,
        extra_question_2_answer: family.extra_question_2_answer,
        extra_question_3_answer: family.extra_question_3_answer,
        extra_info_1_value: family.extra_info_1_value,
        extra_info_2_value: family.extra_info_2_value,
        extra_info_3_value: family.extra_info_3_value,
        members: family.members,
        // Computed fields
        rsvp_status: hasRsvp ? 'submitted' : 'pending',
        attending_count: attendingMembers.length,
        total_members: family.members.length,
        payment_status: latestGift?.status || null,
        invitation_sent: invitationSent,
      };
    });

    const response: ListGuestsResponse = {
      success: true,
      data: {
        items: familiesWithStatus,
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
          message: 'Invalid query parameters',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error fetching guests:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch guests',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/admin/guests
 * Create a new family with members
 */
export async function POST(request: NextRequest) {
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
    
    // Add wedding_id from session
    const input = {
      ...body,
      wedding_id: user.wedding_id,
    };

    // Validate with schema
    const validatedInput = createFamilySchema.parse(input);

    // Create family using service
    const family = await createFamily(validatedInput, user.id);

    const response: APIResponse = {
      success: true,
      data: family,
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
    console.error('Error creating family:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to create family',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
