/**
 * Wedding Planner - Upcoming Tasks Widget API Route
 *
 * GET /api/planner/upcoming-tasks - Get upcoming tasks for planner dashboard widget
 *
 * Features:
 * - Returns next 3 tasks assigned to "Wedding Planner" per wedding
 * - Aggregates tasks across all planner's weddings
 * - Sorted by due date (earliest first) across all weddings
 * - Excludes completed tasks
 * - Includes wedding name (couple names) for each task
 * - Includes color coding based on urgency (red <0 days, orange <30 days, green ≥30 days)
 * - Optimized for fast response (<500ms)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { getUpcomingTasksForPlanner } from '@/lib/checklist/crud';
import type { APIResponse } from '@/types/api';
import type { UpcomingTask } from '@/types/checklist';
import { API_ERROR_CODES } from '@/types/api';
import { DEFAULT_UPCOMING_TASKS_LIMIT } from '@/types/checklist';
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';

/**
 * GET /api/planner/upcoming-tasks
 * Get upcoming tasks for the planner's dashboard widget across all weddings
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

    const plannerId = user.planner_id;

    // Check Redis cache first
    const cacheKey = CACHE_KEYS.plannerUpcomingTasks(plannerId);
    const cached = await getCached<{ plannerTasks: UpcomingTask[]; coupleTasks: UpcomingTask[]; otherTasks: UpcomingTask[] }>(cacheKey);

    const upcomingTasks = cached ?? await (async () => {
      const tasks = await getUpcomingTasksForPlanner(
        plannerId,
        DEFAULT_UPCOMING_TASKS_LIMIT.PLANNER // 3 tasks per wedding per assignee type
      );
      await setCached(cacheKey, tasks, CACHE_TTL.UPCOMING_TASKS);
      return tasks;
    })();

    const response: APIResponse<{ plannerTasks: UpcomingTask[]; coupleTasks: UpcomingTask[]; otherTasks: UpcomingTask[] }> = {
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
          message: 'Planner role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle unexpected errors
    console.error('Error fetching upcoming tasks for planner:', error);
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
