/**
 * Wedding Admin - Mark Notification Read API Route
 *
 * PATCH /api/admin/notifications/:id/read
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse } from '@/types/api';
import { markNotificationReadHandler, handleNotificationApiError } from '@/lib/notifications/api-handlers';

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const { id: trackingEventId } = await params;
    return markNotificationReadHandler(user.wedding_id, trackingEventId, user.id);
  } catch (error) {
    return handleNotificationApiError(error, { operation: 'mark notification read' });
  }
}
