/**
 * Shared Seating API Handlers
 *
 * Contains the full business logic for every seating API operation.
 * Route files (admin and planner) are thin auth-and-dispatch wrappers
 * that call these handlers after resolving the wedding ID and verifying
 * role-specific access.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import type { GetSeatingPlanResponse, TableWithGuests, APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import type { FamilyMember, LayoutElement } from '@/types/models';

// ============================================================================
// GET /seating – fetch full seating plan
// ============================================================================

export async function getSeatingPlanHandler(weddingId: string): Promise<NextResponse> {
  try {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { couple_names: true, couple_table_id: true, layout_elements: true },
    });

    if (!wedding) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Wedding not found' } },
        { status: 404 }
      );
    }

    // Create synthetic couple members
    const names = wedding.couple_names.split(/ & | and | y /i);
    const coupleMembers = [
      {
        id: 'couple-member-1',
        family_id: 'couple-family',
        name: names[0] || 'Partner 1',
        family_name: wedding.couple_names,
        type: 'ADULT',
        attending: true,
        table_id: wedding.couple_table_id,
        seat_index: 0,
      },
      {
        id: 'couple-member-2',
        family_id: 'couple-family',
        name: names[1] || 'Partner 2',
        family_name: wedding.couple_names,
        type: 'ADULT',
        attending: true,
        table_id: wedding.couple_table_id,
        seat_index: 1,
      },
    ];

    const tables = await prisma.table.findMany({
      where: { wedding_id: weddingId },
      orderBy: { number: 'asc' },
      include: {
        assigned_guests: {
          orderBy: { seat_index: 'asc' },
          include: { family: { select: { name: true } } },
        },
      },
    });

    const allConfirmedGuests = await prisma.familyMember.findMany({
      where: { family: { wedding_id: weddingId }, attending: true },
      include: { family: { select: { name: true } } },
    });

    type GuestWithFamilyName = typeof allConfirmedGuests[0] & { family_name: string };

    const formattedTables = tables.map((table) => {
      const assignedGuests: GuestWithFamilyName[] = table.assigned_guests.map((guest) => ({
        ...guest,
        family_name: guest.family.name,
      }));

      if (wedding.couple_table_id === table.id) {
        assignedGuests.push(...(coupleMembers as GuestWithFamilyName[]));
        assignedGuests.sort((a, b) => (a.seat_index || 0) - (b.seat_index || 0));
      }

      return { ...table, assigned_guests: assignedGuests };
    });

    const unassignedGuests: GuestWithFamilyName[] = allConfirmedGuests
      .filter((guest) => !guest.table_id)
      .map((guest) => ({ ...guest, family_name: guest.family.name }));

    if (!wedding.couple_table_id) {
      unassignedGuests.push(...(coupleMembers as GuestWithFamilyName[]));
    }

    const totalGuestsCount = await prisma.familyMember.count({
      where: { family: { wedding_id: weddingId } },
    });
    const confirmedGuestsCount = allConfirmedGuests.length + 2;
    const totalSeats = tables.reduce((acc, table) => acc + table.capacity, 0);
    const assignedSeats =
      allConfirmedGuests.filter((g) => g.table_id).length + (wedding.couple_table_id ? 2 : 0);

    const response: GetSeatingPlanResponse = {
      success: true,
      data: {
        tables: formattedTables as unknown as TableWithGuests[],
        unassigned_guests: unassignedGuests as unknown as Array<FamilyMember & { family_name: string }>,
        stats: {
          total_guests: totalGuestsCount + 2,
          confirmed_guests: confirmedGuestsCount,
          total_seats: totalSeats,
          assigned_seats: assignedSeats,
        },
        layout_elements: wedding.layout_elements as unknown as LayoutElement[],
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching seating plan:', error);
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch seating plan' } },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /seating – update guest seating assignments
// ============================================================================

const assignSchema = z.object({
  assignments: z.array(
    z.object({
      guest_id: z.string(),
      table_id: z.string().uuid().nullable(),
      seat_index: z.number().int().min(0).nullable().optional(),
    })
  ),
});

export async function updateSeatingAssignmentsHandler(
  weddingId: string,
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { assignments } = assignSchema.parse(body);

    const coupleAssignment = assignments.find(
      (a) => a.guest_id === 'couple-member-1' || a.guest_id === 'couple-member-2'
    );
    const guestAssignments = assignments.filter(
      (a) => a.guest_id !== 'couple-member-1' && a.guest_id !== 'couple-member-2'
    );

    if (coupleAssignment) {
      await prisma.wedding.update({
        where: { id: weddingId },
        data: { couple_table_id: coupleAssignment.table_id },
      });
    }

    if (guestAssignments.length > 0) {
      const byTable: Record<string, string[]> = {};
      guestAssignments.forEach((a) => {
        if (a.table_id) {
          if (!byTable[a.table_id]) byTable[a.table_id] = [];
          byTable[a.table_id].push(a.guest_id);
        }
      });

      await prisma.$transaction(async (tx) => {
        const unassignments = guestAssignments.filter((a) => !a.table_id);
        for (const a of unassignments) {
          await tx.familyMember.update({
            where: { id: a.guest_id, family: { wedding_id: weddingId } },
            data: { table_id: null, seat_index: null },
          });
        }

        for (const [tableId, guestIds] of Object.entries(byTable)) {
          const maxSeat = await tx.familyMember.aggregate({
            where: { table_id: tableId },
            _max: { seat_index: true },
          });
          let nextIndex = (maxSeat._max.seat_index ?? -1) + 1;

          for (const guestId of guestIds) {
            const assignment = guestAssignments.find((a) => a.guest_id === guestId);
            await tx.familyMember.update({
              where: { id: guestId, family: { wedding_id: weddingId } },
              data: {
                table_id: tableId,
                seat_index:
                  assignment?.seat_index !== undefined ? assignment.seat_index : nextIndex++,
              },
            });
          }
        }
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid assignment data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }
    console.error('Error updating assignments:', error);
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to update assignments' } },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /seating/tables – upsert tables
// ============================================================================

const upsertTablesSchema = z.object({
  tables: z.array(
    z.object({
      id: z.string().uuid().optional(),
      number: z.number().int().positive(),
      name: z.string().nullable().optional(),
      capacity: z.number().int().positive(),
      type: z.enum(['circle', 'square', 'rectangle']).optional().default('circle'),
      color: z.string().nullable().optional(),
      width: z.number().nullable().optional(),
      height: z.number().nullable().optional(),
      x: z.number().nullable().optional(),
      y: z.number().nullable().optional(),
      rotation: z.number().nullable().optional(),
    })
  ),
  delete_ids: z.array(z.string().uuid()).optional().default([]),
});

export async function upsertTablesHandler(
  weddingId: string,
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { tables, delete_ids } = upsertTablesSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      if (delete_ids.length > 0) {
        await tx.familyMember.updateMany({
          where: { table_id: { in: delete_ids }, family: { wedding_id: weddingId } },
          data: { table_id: null },
        });
        await tx.table.deleteMany({
          where: { id: { in: delete_ids }, wedding_id: weddingId },
        });
      }

      const upsertedTables = [];
      for (const table of tables) {
        if (table.id) {
          const updated = await tx.table.update({
            where: { id: table.id, wedding_id: weddingId },
            data: {
              number: table.number,
              name: table.name || null,
              capacity: table.capacity,
              type: table.type,
              color: table.color || '#ffffff',
              width: table.width ?? 80,
              height: table.height ?? 80,
              x: table.x ?? null,
              y: table.y ?? null,
              rotation: table.rotation ?? 0,
            },
          });
          upsertedTables.push(updated);
        } else {
          const created = await tx.table.create({
            data: {
              wedding_id: weddingId,
              number: table.number,
              name: table.name || null,
              capacity: table.capacity,
              type: table.type,
              color: table.color || '#ffffff',
              width: table.width ?? 80,
              height: table.height ?? 80,
              x: table.x ?? null,
              y: table.y ?? null,
              rotation: table.rotation ?? 0,
            },
          });
          upsertedTables.push(created);
        }
      }

      return upsertedTables;
    });

    const response: APIResponse = { success: true, data: result };
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
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to update tables' } },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /seating/random – randomly assign guests to tables
// ============================================================================

export async function randomAssignHandler(weddingId: string): Promise<NextResponse> {
  try {
    const tables = await prisma.table.findMany({
      where: { wedding_id: weddingId },
      orderBy: { number: 'asc' },
    });

    if (tables.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'No tables configured' },
        },
        { status: 400 }
      );
    }

    const confirmedGuests = await prisma.familyMember.findMany({
      where: { family: { wedding_id: weddingId }, attending: true },
    });

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { couple_table_id: true },
    });

    if (!wedding) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Wedding not found' } },
        { status: 404 }
      );
    }

    type GuestGroupMember = { id: string; isCouple?: boolean; family_id?: string; seating_group?: string | null };
    const groupsMap = new Map<string, GuestGroupMember[]>();
    confirmedGuests.forEach((guest) => {
      const groupId = `${guest.family_id}_${guest.seating_group || 'default'}`;
      if (!groupsMap.has(groupId)) groupsMap.set(groupId, []);
      groupsMap.get(groupId)!.push(guest);
    });

    if (!wedding.couple_table_id) {
      groupsMap.set('couple-group', [
        { id: 'couple-member-1', isCouple: true },
        { id: 'couple-member-2', isCouple: true },
      ]);
    }

    const groups = Array.from(groupsMap.values()).sort(() => Math.random() - 0.5);

    const tableStates = tables.map((t) => ({
      ...t,
      remaining: wedding.couple_table_id === t.id ? t.capacity - 2 : t.capacity,
      guests: [] as string[],
      coupleAssigned: wedding.couple_table_id === t.id,
    }));

    const unassigned: GuestGroupMember[] = [];

    for (const group of groups) {
      let assigned = false;
      const shuffledTables = [...tableStates].sort(() => Math.random() - 0.5);

      for (const table of shuffledTables) {
        if (table.remaining >= group.length) {
          table.remaining -= group.length;
          group.forEach((g) => {
            if (g.isCouple) {
              table.coupleAssigned = true;
            } else {
              table.guests.push(g.id);
            }
          });
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        for (const guest of group) {
          let guestAssigned = false;
          for (const table of tableStates) {
            if (table.remaining >= 1) {
              table.remaining -= 1;
              if (guest.isCouple) {
                table.coupleAssigned = true;
              } else {
                table.guests.push(guest.id);
              }
              guestAssigned = true;
              break;
            }
          }
          if (!guestAssigned) unassigned.push(guest);
        }
      }
    }

    const updates = tableStates.flatMap((table) =>
      table.guests.map((guestId) =>
        prisma.familyMember.update({ where: { id: guestId }, data: { table_id: table.id } })
      )
    );

    const coupleTable = tableStates.find((t) => t.coupleAssigned);
    const coupleUpdate = prisma.wedding.update({
      where: { id: weddingId },
      data: { couple_table_id: coupleTable?.id || null },
    });

    const clearUnassigned = unassigned
      .filter((g) => !g.isCouple)
      .map((guest) =>
        prisma.familyMember.update({ where: { id: guest.id }, data: { table_id: null } })
      );

    await prisma.$transaction([...updates, coupleUpdate, ...clearUnassigned]);

    return NextResponse.json(
      {
        success: true,
        data: {
          assigned_count: confirmedGuests.length + 2 - unassigned.length,
          unassigned_count: unassigned.length,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in random assignment:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to perform random assignment' },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /seating/split – split a family into seating sub-groups
// ============================================================================

const splitFamilySchema = z.object({
  family_id: z.string(),
  groups: z.array(
    z.object({
      name: z.string(),
      guest_ids: z.array(z.string().uuid()),
    })
  ),
});

export async function splitFamilyHandler(
  weddingId: string,
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { family_id, groups } = splitFamilySchema.parse(body);

    const family = await prisma.family.findFirst({
      where: { id: family_id, wedding_id: weddingId },
    });

    if (!family) {
      return NextResponse.json(
        { success: false, error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Family not found' } },
        { status: 404 }
      );
    }

    await prisma.$transaction(
      groups.flatMap((group) =>
        group.guest_ids.map((guestId) =>
          prisma.familyMember.update({
            where: { id: guestId, family_id },
            data: { seating_group: group.name },
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
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to split family' } },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /seating/layout – save canvas layout and table positions
// ============================================================================

const saveLayoutSchema = z.object({
  layout_elements: z.any(),
  tables: z
    .array(
      z.object({
        id: z.string().uuid(),
        x: z.number().nullable(),
        y: z.number().nullable(),
        rotation: z.number().nullable().optional(),
        color: z.string().nullable().optional(),
        width: z.number().nullable().optional(),
        height: z.number().nullable().optional(),
      })
    )
    .optional(),
});

export async function saveLayoutHandler(
  weddingId: string,
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { layout_elements, tables } = saveLayoutSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      await tx.wedding.update({
        where: { id: weddingId },
        data: { layout_elements },
      });

      if (tables && tables.length > 0) {
        for (const table of tables) {
          await tx.table.update({
            where: { id: table.id, wedding_id: weddingId },
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
      { success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to save layout' } },
      { status: 500 }
    );
  }
}
