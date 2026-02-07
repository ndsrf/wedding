/**
 * Wedding Admin - Split Family API Route
 *
 * POST /api/admin/seating/split - Split a family into seating subgroups
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
 * POST /api/admin/seating/split
 * Assign seating_group names to family members to allow splitting them across tables.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.FORBIDDEN,
            message: 'Wedding ID not found in session',
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { family_id, groups } = splitFamilySchema.parse(body);

    // Verify family belongs to wedding
    const family = await prisma.family.findFirst({
      where: {
        id: family_id,
        wedding_id: user.wedding_id,
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
