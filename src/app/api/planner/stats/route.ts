/**
 * Wedding Planner - Stats API Route
 *
 * GET /api/planner/stats - Get dashboard statistics for planner
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/src/lib/auth/middleware';
import type { APIResponse, PlannerStatsResponse, PlannerStats } from '@/src/types/api';
import { API_ERROR_CODES } from '@/src/types/api';

/**
 * GET /api/planner/stats
 * Get dashboard statistics for the authenticated planner
 */
export async function GET(_request: NextRequest) {
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

    // Get total wedding count
    const wedding_count = await prisma.wedding.count({
      where: { planner_id: user.planner_id },
    });

    // Get all weddings for the planner
    const weddings = await prisma.wedding.findMany({
      where: { planner_id: user.planner_id },
      include: {
        families: {
          include: {
            members: true,
          },
        },
      },
    });

    // Calculate total guests across all weddings
    const total_guests = weddings.reduce(
      (sum, wedding) =>
        sum + wedding.families.reduce((familySum, family) => familySum + family.members.length, 0),
      0
    );

    // Calculate RSVP completion percentage
    let totalFamilies = 0;
    let familiesWithRSVP = 0;

    weddings.forEach((wedding) => {
      totalFamilies += wedding.families.length;
      familiesWithRSVP += wedding.families.filter((family) =>
        family.members.some((member) => member.attending !== null)
      ).length;
    });

    const rsvp_completion_percentage =
      totalFamilies > 0 ? Math.round((familiesWithRSVP / totalFamilies) * 100) : 0;

    // Get upcoming weddings (future weddings, sorted by date)
    const today = new Date();
    const upcoming_weddings = await prisma.wedding.findMany({
      where: {
        planner_id: user.planner_id,
        wedding_date: {
          gte: today,
        },
        status: 'ACTIVE',
      },
      orderBy: {
        wedding_date: 'asc',
      },
      take: 5, // Limit to next 5 weddings
    });

    const stats: PlannerStats = {
      wedding_count,
      total_guests,
      rsvp_completion_percentage,
      upcoming_weddings,
    };

    const response: PlannerStatsResponse = {
      success: true,
      data: stats,
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

    // Handle unexpected errors
    console.error('Error fetching planner stats:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch planner stats',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
