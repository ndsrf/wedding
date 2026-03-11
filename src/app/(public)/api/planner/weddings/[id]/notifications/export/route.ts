/**
 * Wedding Planner - Export Notifications API Route
 *
 * POST /api/planner/weddings/:id/notifications/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse } from '@/types/api';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { exportNotificationsHandler, handleNotificationApiError } from '@/lib/notifications/api-handlers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole('planner');

    if (!user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    return exportNotificationsHandler(weddingId, request);
  } catch (error) {
    return handleNotificationApiError(error, { operation: 'export notifications' });
  }
}
