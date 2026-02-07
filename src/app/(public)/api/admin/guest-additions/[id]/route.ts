/**
 * Wedding Admin - Single Guest Addition API Route
 *
 * PATCH /api/admin/guest-additions/:id - Update/review guest addition
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/guest-additions/:id
 * Update guest addition details or mark as reviewed
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

    const { id: memberId } = await context.params;

    // Verify member exists, was added by guest, and belongs to user's wedding
    const existingMember = await prisma.familyMember.findFirst({
      where: {
        id: memberId,
        added_by_guest: true,
        family: {
          wedding_id: user.wedding_id,
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
          wedding_id: user.wedding_id,
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
