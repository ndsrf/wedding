/**
 * Wedding Planner - Split Family API Route
 *
 * POST /api/planner/weddings/:id/seating/split - Split a family into seating subgroups
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';

const splitFamilySchema = z.object({
  family_id: z.string(),
  groups: z.array(
    z.object({
      name: z.string(),
      guest_ids: z.array(z.string().uuid()),
    })
  ),
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
 * POST /api/planner/weddings/:id/seating/split
 * Assign seating_group names to family members to allow splitting them across tables.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Planner ID not found in session',
          },
        },
        { status: 403 }
      );
    }

    const { id: weddingId } = await params;

    // Validate planner access to wedding
    const accessCheck = await validatePlannerAccess(user.planner_id, weddingId);
    if (!accessCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: accessCheck.status === 404 ? API_ERROR_CODES.NOT_FOUND : API_ERROR_CODES.FORBIDDEN,
            message: accessCheck.error!,
          },
        },
        { status: accessCheck.status }
      );
    }

    const body = await request.json();
    const { family_id, groups } = splitFamilySchema.parse(body);

    // Verify family belongs to wedding
    const family = await prisma.family.findFirst({
      where: {
        id: family_id,
        wedding_id: weddingId,
      },
    });

    if (!family) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.NOT_FOUND,
            message: 'Family not found',
          },
        },
        { status: 404 }
      );
    }

    // Update seating_group for each member in each group
    await prisma.$transaction(
      groups.flatMap((group) =>
        group.guest_ids.map((guestId) =>
          prisma.familyMember.update({
            where: {
              id: guestId,
              family_id: family_id,
            },
            data: {
              seating_group: group.name,
            },
          })
        )
      )
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid split data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    console.error('Error splitting family:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to split family',
        },
      },
      { status: 500 }
    );
  }
}
