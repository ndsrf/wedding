/**
 * Wedding Planner - Stats API Route
 *
 * GET /api/planner/stats - Get dashboard statistics for planner
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import type { APIResponse, PlannerStatsResponse, PlannerStats } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

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

    // Serve from Redis on cache hit
    const cacheKey = CACHE_KEYS.plannerStats(user.planner_id);
    const cached = await getCached<PlannerStats>(cacheKey);
    if (cached) {
      const response: PlannerStatsResponse = { success: true, data: cached };
      return NextResponse.json(response, {
        status: 200,
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
      });
    }

    const today = new Date();

    // Single $queryRaw aggregate replaces the three Prisma queries that generated
    // expensive LEFT JOIN families → weddings (once per count variant).
    // Uses ANY(subquery) so Postgres resolves planner → wedding IDs via index,
    // then counts families/members/rsvp in one table scan instead of three.
    const [aggregateStats, wedding_count, upcoming_weddings] = await Promise.all([
      prisma.$queryRaw<[{ total_families: number; total_guests: number; families_with_rsvp: number }]>`
        SELECT
          COUNT(DISTINCT f.id)::int                                               AS total_families,
          COUNT(fm.id)::int                                                       AS total_guests,
          COUNT(DISTINCT CASE WHEN fm.attending IS NOT NULL THEN f.id END)::int   AS families_with_rsvp
        FROM families f
        LEFT JOIN family_members fm ON fm.family_id = f.id
        WHERE f.wedding_id = ANY(
          SELECT id FROM weddings WHERE planner_id = ${user.planner_id}
        )
      `,
      prisma.wedding.count({ where: { planner_id: user.planner_id } }),
      prisma.wedding.findMany({
        where: {
          planner_id: user.planner_id,
          wedding_date: { gte: today },
          status: 'ACTIVE',
        },
        orderBy: { wedding_date: 'asc' },
        take: 5,
        include: { main_event_location: { select: { name: true } } },
      }),
    ]);

    const row = aggregateStats[0] ?? { total_families: 0, total_guests: 0, families_with_rsvp: 0 };
    const rsvp_completion_percentage =
      row.total_families > 0 ? Math.round((row.families_with_rsvp / row.total_families) * 100) : 0;

    const stats: PlannerStats = {
      wedding_count,
      total_guests: row.total_guests,
      rsvp_completion_percentage,
      upcoming_weddings,
    };

    await setCached(cacheKey, stats, CACHE_TTL.WEDDING_STATS);

    const response: PlannerStatsResponse = {
      success: true,
      data: stats,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' },
    });
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
