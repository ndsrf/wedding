/**
 * Wedding Admin - Seating Plan API Route
 *
 * GET /api/admin/seating - Get seating plan data (tables, unassigned guests, stats)
 * POST /api/admin/seating - Update seating assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { GetSeatingPlanResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

/**
 * GET /api/admin/seating
 * Get all tables and guests (assigned and unassigned)
 */
export async function GET() {
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

    // Fetch wedding details for couple names
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { couple_names: true, couple_table_id: true },
    });

    if (!wedding) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: API_ERROR_CODES.NOT_FOUND,
            message: 'Wedding not found',
          },
        },
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
      },
      {
        id: 'couple-member-2',
        family_id: 'couple-family',
        name: names[1] || 'Partner 2',
        family_name: wedding.couple_names,
        type: 'ADULT',
        attending: true,
        table_id: wedding.couple_table_id,
      },
    ];

    // Fetch all tables with assigned guests
    const tables = await prisma.table.findMany({
      where: { wedding_id: user.wedding_id },
      orderBy: { number: 'asc' },
      include: {
        assigned_guests: {
          include: {
            family: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Fetch all confirmed guests (attending = true)
    const allConfirmedGuests = await prisma.familyMember.findMany({
      where: {
        family: { wedding_id: user.wedding_id },
        attending: true,
      },
      include: {
        family: {
          select: { name: true },
        },
      },
    });

    // Map tables to include family_name and add couple members if assigned
    type GuestWithFamilyName = typeof allConfirmedGuests[0] & { family_name: string };
    const formattedTables = tables.map((table) => {
      const assignedGuests: GuestWithFamilyName[] = table.assigned_guests.map((guest) => ({
        ...guest,
        family_name: guest.family.name,
      }));

      // Add couple if assigned to this table
      if (wedding.couple_table_id === table.id) {
        assignedGuests.push(...coupleMembers as GuestWithFamilyName[]);
      }

      return {
        ...table,
        assigned_guests: assignedGuests,
      };
    });

    // Find unassigned guests
    const unassignedGuests: GuestWithFamilyName[] = allConfirmedGuests
      .filter((guest) => !guest.table_id)
      .map((guest) => ({
        ...guest,
        family_name: guest.family.name,
      }));

    // Add couple to unassigned if not assigned to any table
    if (!wedding.couple_table_id) {
      unassignedGuests.push(...coupleMembers as GuestWithFamilyName[]);
    }

    // Calculate stats
    const totalGuestsCount = await prisma.familyMember.count({
      where: { family: { wedding_id: user.wedding_id } },
    });
    const confirmedGuestsCount = allConfirmedGuests.length + 2; // +2 for the couple
    const totalSeats = tables.reduce((acc, table) => acc + table.capacity, 0);
    const assignedSeats = allConfirmedGuests.filter((g) => g.table_id).length + (wedding.couple_table_id ? 2 : 0);

    const response: GetSeatingPlanResponse = {
      success: true,
      data: {
        tables: formattedTables,
        unassigned_guests: unassignedGuests,
        stats: {
          total_guests: totalGuestsCount + 2, // +2 for the couple
          confirmed_guests: confirmedGuestsCount,
          total_seats: totalSeats,
          assigned_seats: assignedSeats,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching seating plan:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to fetch seating plan',
        },
      },
      { status: 500 }
    );
  }
}

const assignSchema = z.object({
  assignments: z.array(
    z.object({
      guest_id: z.string(),
      table_id: z.string().uuid().nullable(),
    })
  ),
});

/**
 * POST /api/admin/seating
 * Update guest seating assignments
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
    const { assignments } = assignSchema.parse(body);

    // Separate couple assignments from normal guest assignments
    const coupleAssignment = assignments.find((a) => a.guest_id === 'couple-member-1' || a.guest_id === 'couple-member-2');
    const guestAssignments = assignments.filter((a) => a.guest_id !== 'couple-member-1' && a.guest_id !== 'couple-member-2');

    // Update couple seating in Wedding model if assigned
    if (coupleAssignment) {
      await prisma.wedding.update({
        where: { id: user.wedding_id },
        data: { couple_table_id: coupleAssignment.table_id },
      });
    }

    // Update each guest assignment
    if (guestAssignments.length > 0) {
      // Using a transaction for atomicity
      await prisma.$transaction(
        guestAssignments.map((assignment) =>
          prisma.familyMember.update({
            where: {
              id: assignment.guest_id,
              family: { wedding_id: user.wedding_id as string }, // Security check
            },
            data: {
              table_id: assignment.table_id,
            },
          })
        )
      );
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
      {
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to update assignments',
        },
      },
      { status: 500 }
    );
  }
}
