/**
 * Master Admin - Planners API Routes
 *
 * GET /api/master/planners - List all wedding planners (paginated)
 * POST /api/master/planners - Create a new wedding planner
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type {
  APIResponse,
  ListPlannersResponse,
  CreatePlannerResponse,
  CreatePlannerRequest,
} from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

// Validation schema for creating a planner
const createPlannerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  logo_url: z.string().url('Invalid logo URL').optional(),
});

// Validation schema for query parameters
const listPlannersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

/**
 * GET /api/master/planners
 * List all wedding planners with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and require master_admin role
    await requireRole('master_admin');

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = listPlannersQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
    });

    const { page, limit } = queryParams;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await prisma.weddingPlanner.count();

    // Fetch planners with pagination and include wedding count
    const planners = await prisma.weddingPlanner.findMany({
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        _count: {
          select: {
            weddings: true,
          },
        },
      },
    });

    // Transform response to include wedding count
    const plannersWithCount = planners.map((planner) => ({
      id: planner.id,
      email: planner.email,
      name: planner.name,
      google_id: planner.google_id,
      auth_provider: planner.auth_provider,
      last_login_provider: planner.last_login_provider,
      preferred_language: planner.preferred_language,
      logo_url: planner.logo_url,
      enabled: planner.enabled,
      subscription_status: planner.subscription_status,
      created_at: planner.created_at,
      created_by: planner.created_by,
      last_login_at: planner.last_login_at,
      wedding_count: planner._count.weddings,
    }));

    const response: ListPlannersResponse = {
      success: true,
      data: {
        items: plannersWithCount,
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
    console.error('Error fetching planners:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch planners',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/master/planners
 * Create a new wedding planner
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and require master_admin role
    const user = await requireRole('master_admin');

    // Parse and validate request body
    const body = await request.json();
    const validatedData: CreatePlannerRequest = createPlannerSchema.parse(body);

    // Check if planner with this email already exists
    const existingPlanner = await prisma.weddingPlanner.findUnique({
      where: { email: validatedData.email },
    });

    if (existingPlanner) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.ALREADY_EXISTS,
          message: 'A planner with this email already exists',
        },
      };
      return NextResponse.json(response, { status: 409 });
    }

    // Create the new planner
    // Note: auth_provider will be set on first login via OAuth
    const planner = await prisma.weddingPlanner.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        logo_url: validatedData.logo_url,
        enabled: true,
        auth_provider: 'GOOGLE', // Default, will be updated on first login
        created_by: user.id,
      },
    });

    const response: CreatePlannerResponse = {
      success: true,
      data: planner,
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
          message: 'Invalid request data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error creating planner:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to create planner',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
