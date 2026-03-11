/**
 * Wedding Admin - Notifications API Route
 *
 * GET /api/admin/notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse } from '@/types/api';
import { listNotificationsHandler, handleNotificationApiError } from '@/lib/notifications/api-handlers';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    return listNotificationsHandler(user.wedding_id, new URL(request.url).searchParams, user.id);
  } catch (error) {
    return handleNotificationApiError(error, { operation: 'fetch notifications' });
  }
}