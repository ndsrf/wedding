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

    // Fetch upcoming tasks across all planner's weddings
    // Returns 3 tasks per wedding assigned to WEDDING_PLANNER, sorted by due date with urgency color coding
    const upcomingTasks = await getUpcomingTasksForPlanner(
      user.planner_id,
      DEFAULT_UPCOMING_TASKS_LIMIT.PLANNER // 3 tasks per wedding
    );

    const response: APIResponse<UpcomingTask[]> = {
      success: true,
      data: upcomingTasks,
    };

    // Add cache headers for performance (cache for 1 minute)
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60',
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
