/**
 * Master Admin - Analytics API Routes
 *
 * GET /api/master/analytics - Get platform-wide analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse, MasterAnalyticsResponse, MasterAnalytics } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

/**
 * GET /api/master/analytics
 * Get platform analytics including:
 * - Total planners
 * - Active planners (enabled=true)
 * - Total weddings
 * - Total guests (sum of all families)
 */
export async function GET(_request: NextRequest) {
  try {
    // Check authentication and require master_admin role
    await requireRole('master_admin');

    // Execute all queries in parallel for better performance
    const [totalPlanners, activePlanners, totalWeddings, totalGuests] = await Promise.all([
      // Count total planners
      prisma.weddingPlanner.count(),

      // Count active (enabled) planners
      prisma.weddingPlanner.count({
        where: { enabled: true },
      }),

      // Count total weddings
      prisma.wedding.count(),

      // Count total families (guests) across all weddings
      prisma.family.count(),
    ]);

    const analytics: MasterAnalytics = {
      total_planners: totalPlanners,
      active_planners: activePlanners,
      total_weddings: totalWeddings,
      total_guests: totalGuests,
    };

    const response: MasterAnalyticsResponse = {
      success: true,
      data: analytics,
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
          message: 'Master admin role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle unexpected errors
    console.error('Error fetching analytics:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch analytics',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
