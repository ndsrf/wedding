/**
 * Wedding Admin - Tables API Route
 *
 * POST /api/admin/seating/tables - Upsert (create/update/delete) tables
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

const upsertTablesSchema = z.object({
  tables: z.array(
    z.object({
      id: z.string().uuid().optional(),
      number: z.number().int().positive(),
      name: z.string().nullable().optional(),
      capacity: z.number().int().positive(),
    })
  ),
  delete_ids: z.array(z.string().uuid()).optional().default([]),
});

/**
 * POST /api/admin/seating/tables
 * Bulk upsert tables and delete requested ones
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
    const { tables, delete_ids } = upsertTablesSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete tables
      if (delete_ids.length > 0) {
        // First unassign guests from these tables
        await tx.familyMember.updateMany({
          where: {
            table_id: { in: delete_ids },
            family: { wedding_id: user.wedding_id },
          },
          data: { table_id: null },
        });

        await tx.table.deleteMany({
          where: {
            id: { in: delete_ids },
            wedding_id: user.wedding_id,
          },
        });
      }

      // 2. Upsert tables
      const upsertedTables = [];
      for (const table of tables) {
        if (table.id) {
          // Update
          const updated = await tx.table.update({
            where: {
              id: table.id,
              wedding_id: user.wedding_id,
            },
            data: {
              number: table.number,
              name: table.name || null,
              capacity: table.capacity,
            },
          });
          upsertedTables.push(updated);
        } else {
          // Create
          const created = await tx.table.create({
            data: {
              wedding_id: user.wedding_id as string,
              number: table.number,
              name: table.name || null,
              capacity: table.capacity,
            },
          });
          upsertedTables.push(created);
        }
      }

      return upsertedTables;
    });

    const response: APIResponse = {
      success: true,
      data: result,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid table data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    console.error('Error upserting tables:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to update tables',
        },
      },
      { status: 500 }
    );
  }
}
