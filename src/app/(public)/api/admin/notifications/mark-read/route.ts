/**
 * Wedding Admin - Bulk Mark Notifications Read API Route
 *
 * POST /api/admin/notifications/mark-read
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse } from '@/types/api';
import { bulkMarkNotificationsReadHandler, handleNotificationApiError } from '@/lib/notifications/api-handlers';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const body = await request.json();
    return bulkMarkNotificationsReadHandler(user.wedding_id, body, user.id);
  } catch (error) {
    return handleNotificationApiError(error, { operation: 'bulk mark notifications read' });
  }
}
