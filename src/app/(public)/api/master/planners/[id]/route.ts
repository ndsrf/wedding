/**
 * Master Admin - Individual Planner API Routes
 *
 * PATCH /api/master/planners/:id - Update planner enabled status
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse, UpdatePlannerResponse, UpdatePlannerRequest } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

// Validation schema for updating a planner
const updatePlannerSchema = z.object({
  enabled: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PATCH /api/master/planners/:id
 * Update planner enabled status
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // Check authentication and require master_admin role
    await requireRole('master_admin');

    const params = await context.params;
    const { id } = params;

    // Validate planner ID format (UUID)
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid planner ID format',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if planner exists
    const existingPlanner = await prisma.weddingPlanner.findUnique({
      where: { id },
    });

    if (!existingPlanner) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Planner not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData: UpdatePlannerRequest = updatePlannerSchema.parse(body);

    // Check if there's actually something to update
    if (validatedData.enabled === undefined) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'No fields to update',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Update the planner
    const updatedPlanner = await prisma.weddingPlanner.update({
      where: { id },
      data: {
        enabled: validatedData.enabled,
      },
    });

    const response: UpdatePlannerResponse = {
      success: true,
      data: updatedPlanner,
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
          message: 'Invalid request data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error updating planner:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update planner',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
