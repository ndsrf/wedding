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
      search: searchParams.get('search') || undefined,
    });

    const { page, limit, rsvp_status, attendance, channel, payment_status, search } =
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

    // Get all families matching base filters first (for RSVP and attendance filtering)
    let familyIds: string[] | undefined;

    // RSVP status filter - requires checking members
    if (rsvp_status) {
      const familiesWithRsvpStatus = await prisma.family.findMany({
        where: { wedding_id: user.wedding_id },
        include: { members: { select: { attending: true } } },
      });

      if (rsvp_status === 'submitted') {
        familyIds = familiesWithRsvpStatus
          .filter((f) => f.members.some((m) => m.attending !== null))
          .map((f) => f.id);
      } else {
        familyIds = familiesWithRsvpStatus
          .filter((f) => f.members.every((m) => m.attending === null))
          .map((f) => f.id);
      }
    }

    // Attendance filter - requires checking members
    if (attendance) {
      const familiesWithAttendance = await prisma.family.findMany({
        where: { wedding_id: user.wedding_id },
        include: { members: { select: { attending: true } } },
      });

      let filteredIds: string[];
      if (attendance === 'yes') {
        // Families with at least one member attending
        filteredIds = familiesWithAttendance
          .filter((f) => f.members.length > 0 && f.members.some((m) => m.attending === true))
          .map((f) => f.id);
      } else if (attendance === 'no') {
        // Families where no members are attending (all responded no, or mix of no/pending)
        filteredIds = familiesWithAttendance
          .filter(
            (f) =>
              f.members.length > 0 &&
              !f.members.some((m) => m.attending === true) &&
              f.members.some((m) => m.attending === false)
          )
          .map((f) => f.id);
      } else {
        // partial - some attending, some not or pending
        filteredIds = familiesWithAttendance
          .filter(
            (f) =>
              f.members.some((m) => m.attending === true) &&
              f.members.some((m) => m.attending === false || m.attending === null)
          )
          .map((f) => f.id);
      }

      familyIds = familyIds
        ? familyIds.filter((id) => filteredIds.includes(id))
        : filteredIds;
    }

    // Payment status filter - requires checking gifts
    if (payment_status) {
      const familiesWithPayment = await prisma.family.findMany({
        where: { wedding_id: user.wedding_id },
        include: { gifts: { select: { status: true } } },
      });

      const filteredIds = familiesWithPayment
        .filter((f) => f.gifts.some((g) => g.status === payment_status))
        .map((f) => f.id);

      familyIds = familyIds
        ? familyIds.filter((id) => filteredIds.includes(id))
        : filteredIds;
    }

    // Apply familyIds filter if any filters were applied
    if (familyIds !== undefined) {
      whereClause.id = { in: familyIds };
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
      },
    });

    // Transform response to include RSVP status and payment status
    const familiesWithStatus = families.map((family) => {
      const hasRsvp = family.members.some((m) => m.attending !== null);
      const attendingMembers = family.members.filter((m) => m.attending === true);
      const latestGift = family.gifts[0];

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
        created_at: family.created_at,
        members: family.members,
        // Computed fields
        rsvp_status: hasRsvp ? 'submitted' : 'pending',
        attending_count: attendingMembers.length,
        total_members: family.members.length,
        payment_status: latestGift?.status || null,
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
