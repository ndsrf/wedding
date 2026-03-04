/**
 * Wedding Admin - Upcoming Tasks Widget API Route
 *
 * GET /api/admin/upcoming-tasks - Get upcoming tasks for wedding admin dashboard widget
 *
 * Features:
 * - Returns next 5 tasks assigned to "Couple" for the wedding
 * - Sorted by due date (earliest first)
 * - Excludes completed tasks
 * - Includes color coding based on urgency (red <0 days, orange <30 days, green ≥30 days)
 * - Optimized for fast response (<500ms)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { getUpcomingTasks } from '@/lib/checklist/crud';
import type { APIResponse } from '@/types/api';
import type { UpcomingTask } from '@/types/checklist';
import { API_ERROR_CODES } from '@/types/api';
import { DEFAULT_UPCOMING_TASKS_LIMIT } from '@/types/checklist';
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';

/**
 * GET /api/admin/upcoming-tasks
 * Get upcoming tasks for the wedding admin's dashboard widget
 */
export async function GET(_request: NextRequest) {
  try {
    // Check authentication and require wedding_admin role
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Wedding ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const weddingId = user.wedding_id;

    // Check Redis cache first
    const cacheKey = CACHE_KEYS.adminUpcomingTasks(weddingId);
    const cached = await getCached<UpcomingTask[]>(cacheKey);

    const upcomingTasks = cached ?? await (async () => {
      const tasks = await getUpcomingTasks(
        weddingId,
        'COUPLE',
        DEFAULT_UPCOMING_TASKS_LIMIT.ADMIN // 5 tasks
      );
      await setCached(cacheKey, tasks, CACHE_TTL.UPCOMING_TASKS);
      return tasks;
    })();

    const response: APIResponse<UpcomingTask[]> = {
      success: true,
      data: upcomingTasks,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Cache': cached ? 'HIT' : 'MISS',
        'Cache-Control': 'private, max-age=120, stale-while-revalidate=60',
      },
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
          message: 'Wedding admin role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle unexpected errors
    console.error('Error fetching upcoming tasks for admin:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch upcoming tasks',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
