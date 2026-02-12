/**
 * Wedding Planner - Single Guest Addition API Route
 *
 * PATCH /api/planner/weddings/:id/guest-additions/:memberId - Update/review guest addition
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse, UpdateGuestAdditionResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

// Validation schema for updating guest addition
const updateGuestAdditionSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['ADULT', 'CHILD', 'INFANT']).optional(),
  age: z.number().int().min(0).max(150).nullable().optional(),
  mark_reviewed: z.boolean().optional(),
});

/**
 * Helper to validate planner access to wedding
 */
async function validatePlannerAccess(plannerId: string, weddingId: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { planner_id: true },
  });

  if (!wedding) {
    return { valid: false, error: 'Wedding not found', status: 404 };
  }

  if (wedding.planner_id !== plannerId) {
    return { valid: false, error: 'You do not have access to this wedding', status: 403 };
  }

  return { valid: true };
}

/**
 * PATCH /api/planner/weddings/:id/guest-additions/:memberId
 * Update guest addition details or mark as reviewed
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
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

    const { id: weddingId, memberId } = await params;

    // Validate planner access to wedding
    const accessCheck = await validatePlannerAccess(user.planner_id, weddingId);
    if (!accessCheck.valid) {
      const response: APIResponse = {
        success: false,
        error: {
          code: accessCheck.status === 404 ? API_ERROR_CODES.NOT_FOUND : API_ERROR_CODES.FORBIDDEN,
          message: accessCheck.error!,
        },
      };
      return NextResponse.json(response, { status: accessCheck.status });
    }

    // Verify member exists, was added by guest, and belongs to the wedding
    const existingMember = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        added_by_guest: true,
        family: {
          wedding_id: weddingId,
        },
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            wedding_id: true,
          },
        },
      },
    });

    if (!existingMember) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Guest addition not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateGuestAdditionSchema.parse(body);

    // Build update data
    const updateData: {
      name?: string;
      type?: 'ADULT' | 'CHILD' | 'INFANT';
      age?: number | null;
    } = {};

    if (validatedData.name) {
      updateData.name = validatedData.name;
    }

    if (validatedData.type) {
      updateData.type = validatedData.type;
    }

    if (validatedData.age !== undefined) {
      updateData.age = validatedData.age;
    }

    // Update member
    const member = await prisma.familyMember.update({
      where: { id: memberId },
      data: updateData,
    });

    // If marking as reviewed, create/update notification record
    if (validatedData.mark_reviewed) {
      await prisma.notification.upsert({
        where: {
          id: `review-${memberId}`, // Use predictable ID for upsert
        },
        create: {
          id: `review-${memberId}`,
          wedding_id: weddingId,
          family_id: existingMember.family_id,
          event_type: 'GUEST_ADDED',
          details: {
            member_id: memberId,
            member_name: member.name,
            reviewed_by: user.id,
          },
          read: true,
          read_at: new Date(),
          admin_id: user.id,
        },
        update: {
          read: true,
          read_at: new Date(),
          details: {
            member_id: memberId,
            member_name: member.name,
            reviewed_by: user.id,
          },
        },
      });
    }

    const response: UpdateGuestAdditionResponse = {
      success: true,
      data: member,
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
    console.error('Error updating guest addition:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to update guest addition',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
