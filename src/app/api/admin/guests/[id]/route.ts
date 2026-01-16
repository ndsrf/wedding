/**
 * Wedding Admin - Single Guest API Route
 *
 * PATCH /api/admin/guests/:id - Update family contact info
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/src/lib/auth/middleware';
import type { APIResponse, UpdateGuestResponse } from '@/src/types/api';
import { API_ERROR_CODES } from '@/src/types/api';

// Validation schema for updating family
const updateFamilySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp_number: z.string().nullable().optional(),
  channel_preference: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).nullable().optional(),
  preferred_language: z.enum(['ES', 'EN', 'FR', 'IT', 'DE']).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/guests/:id
 * Update family contact information
 */
export async function PATCH(request: NextRequest, context: RouteParams) {
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

    const { id: familyId } = await context.params;

    // Verify family belongs to user's wedding
    const existingFamily = await prisma.family.findFirst({
      where: {
        id: familyId,
        wedding_id: user.wedding_id,
      },
    });

    if (!existingFamily) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Family not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateFamilySchema.parse(body);

    // Update family
    const family = await prisma.family.update({
      where: { id: familyId },
      data: validatedData,
    });

    const response: UpdateGuestResponse = {
      success: true,
      data: family,
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
    console.error('Error updating family:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update family',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
