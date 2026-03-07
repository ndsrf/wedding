/**
 * Wedding Admin - Seating Layout API Route
 *
 * POST /api/admin/seating/layout - Save canvas layout and table positions
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';

const saveLayoutSchema = z.object({
  layout_elements: z.any(),
  tables: z.array(
    z.object({
      id: z.string().uuid(),
      x: z.number().nullable(),
      y: z.number().nullable(),
      rotation: z.number().nullable().optional(),
      color: z.string().nullable().optional(),
      width: z.number().nullable().optional(),
      height: z.number().nullable().optional(),
    })
  ).optional(),
});

/**
 * POST /api/admin/seating/layout
 * Save the layout elements (lines, text) and table positions
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
    const { layout_elements, tables } = saveLayoutSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      // 1. Update wedding layout elements
      await tx.wedding.update({
        where: { id: user.wedding_id },
        data: { layout_elements },
      });

      // 2. Update table positions if provided
      if (tables && tables.length > 0) {
        for (const table of tables) {
          await tx.table.update({
            where: {
              id: table.id,
              wedding_id: user.wedding_id,
            },
            data: {
              x: table.x,
              y: table.y,
              rotation: table.rotation ?? 0,
              color: table.color,
              width: table.width,
              height: table.height,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid layout data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    console.error('Error saving layout:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to save layout',
        },
      },
      { status: 500 }
    );
  }
}
