/**
 * Wedding Admin - Random Seating Assignment API Route
 *
 * POST /api/admin/seating/random - Randomly assign confirmed guests to tables
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';

/**
 * POST /api/admin/seating/random
 * Greedily and randomly assign guests to tables, keeping families/groups together.
 */
export async function POST() {
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

    // 1. Fetch tables and confirmed guests
    const tables = await prisma.table.findMany({
      where: { wedding_id: user.wedding_id },
      orderBy: { number: 'asc' },
    });

    if (tables.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'No tables configured',
          },
        },
        { status: 400 }
      );
    }

    const confirmedGuests = await prisma.familyMember.findMany({
      where: {
        family: { wedding_id: user.wedding_id },
        attending: true,
      },
    });

    // Fetch wedding for couple seating
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { couple_table_id: true },
    });

    if (!wedding) {
      return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Wedding not found' } }, { status: 404 });
    }

    // 2. Group guests by (family_id + seating_group)
    const groupsMap = new Map<string, any[]>();
    confirmedGuests.forEach((guest) => {
      const groupId = `${guest.family_id}_${guest.seating_group || 'default'}`;
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, []);
      }
      groupsMap.get(groupId)!.push(guest);
    });

    // Add couple as a group if not assigned
    if (!wedding.couple_table_id) {
      groupsMap.set('couple-group', [
        { id: 'couple-member-1', isCouple: true },
        { id: 'couple-member-2', isCouple: true },
      ]);
    }

    // Shuffle groups to make it "random"
    const groups = Array.from(groupsMap.values()).sort(() => Math.random() - 0.5);

    // 3. Greedy assignment
    const tableStates = tables.map((t) => ({
      ...t,
      remaining: wedding.couple_table_id === t.id ? t.capacity - 2 : t.capacity,
      guests: [] as string[],
      coupleAssigned: wedding.couple_table_id === t.id,
    }));

    const unassigned: any[] = [];

    for (const group of groups) {
      let assigned = false;
      
      // Try to find a table with enough space
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
                // For couple, we try to keep them together, but if they split here, 
                // we'll just assign the first one we find.
                // In practice, since we try group first, this is last resort.
                table.coupleAssigned = true;
              } else {
                table.guests.push(guest.id);
              }
              guestAssigned = true;
              break;
            }
          }
          if (!guestAssigned) {
            unassigned.push(guest);
          }
        }
      }
    }

    // 4. Update database
    const updates = tableStates.flatMap((table) =>
      table.guests.map((guestId) =>
        prisma.familyMember.update({
          where: { id: guestId },
          data: { table_id: table.id },
        })
      )
    );

    // Update couple seating
    const coupleTable = tableStates.find(t => t.coupleAssigned);
    const coupleUpdate = prisma.wedding.update({
      where: { id: user.wedding_id },
      data: { couple_table_id: coupleTable?.id || null },
    });

    // Also clear table_id for unassigned guests if they had one
    const clearUnassigned = unassigned.filter(g => !g.isCouple).map((guest) =>
      prisma.familyMember.update({
        where: { id: guest.id },
        data: { table_id: null },
      })
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
        error: {
          code: API_ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to perform random assignment',
        },
      },
      { status: 500 }
    );
  }
}
