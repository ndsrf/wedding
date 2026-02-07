/**
 * Master Admin - Weddings API Routes
 *
 * GET /api/master/weddings - List all weddings (read-only, paginated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse, ListMasterWeddingsResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

// Validation schema for query parameters
const listWeddingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  planner_id: z.string().uuid().optional(),
});

/**
 * GET /api/master/weddings
 * List all weddings (read-only) with pagination
 * Optionally filter by planner_id
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and require master_admin role
    await requireRole('master_admin');

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = listWeddingsQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      planner_id: searchParams.get('planner_id') || undefined,
    });

    const { page, limit, planner_id } = queryParams;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = planner_id ? { planner_id } : {};

    // Get total count for pagination
    const total = await prisma.wedding.count({ where });

    // Fetch weddings with pagination, including planner info and guest count
    const weddings = await prisma.wedding.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        wedding_date: 'desc',
      },
      include: {
        planner: {
          select: {
            id: true,
            name: true,
            email: true,
            logo_url: true,
          },
        },
        theme: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            families: true,
            wedding_admins: true,
          },
        },
      },
    });

    // Transform response to include counts
    const weddingsWithDetails = weddings.map((wedding) => ({
      id: wedding.id,
      planner_id: wedding.planner_id,
      planner_name: wedding.planner.name,
      planner_email: wedding.planner.email,
      theme_id: wedding.theme_id,
      theme_name: wedding.theme?.name || null,
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
      family_count: wedding._count.families,
      admin_count: wedding._count.wedding_admins,
    }));

    const response: ListMasterWeddingsResponse = {
      success: true,
      data: {
        items: weddingsWithDetails,
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
          message: 'Master admin role required',
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
