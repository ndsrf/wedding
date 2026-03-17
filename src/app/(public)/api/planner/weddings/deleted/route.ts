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
import { getWeddingDisplayLocation } from '@/lib/wedding-utils';

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

    // Fetch weddings with pagination
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
        main_event_location: true,
        _count: {
          select: {
            families: true,
            wedding_admins: true,
          },
        },
      },
    });

    // Fetch all families + members + gifts for the current page in one batched
    // query instead of one query per wedding (eliminates the N+1 pattern).
    const weddingIds = weddings.map((w) => w.id);
    const allFamilies = await prisma.family.findMany({
      where: { wedding_id: { in: weddingIds } },
      select: {
        id: true,
        wedding_id: true,
        members: { select: { id: true, attending: true } },
        gifts: { select: { id: true, status: true } },
      },
    });

    // Group families by wedding_id for O(1) lookup
    const familiesByWedding = new Map<string, typeof allFamilies>();
    for (const family of allFamilies) {
      const list = familiesByWedding.get(family.wedding_id) ?? [];
      list.push(family);
      familiesByWedding.set(family.wedding_id, list);
    }

    const weddingsWithStats = weddings.map((wedding) => {
      const families = familiesByWedding.get(wedding.id) ?? [];

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

      return {
        ...wedding,
        location: getWeddingDisplayLocation(wedding),
        guest_count,
        rsvp_count,
        rsvp_completion_percentage,
        attending_count,
        payment_received_count,
      };
    });

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
          details: error.issues,
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
