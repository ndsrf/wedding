/**
 * Wedding Planner - Mark Notification Read API Route
 *
 * PATCH /api/planner/weddings/:id/notifications/:notificationId/read
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse } from '@/types/api';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { markNotificationReadHandler, handleNotificationApiError } from '@/lib/notifications/api-handlers';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; notificationId: string }> },
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

    const { id: weddingId, notificationId: trackingEventId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    return markNotificationReadHandler(weddingId, trackingEventId, user.id);
  } catch (error) {
    return handleNotificationApiError(error, { operation: 'mark notification read' });
  }
}
