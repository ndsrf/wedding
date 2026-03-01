/**
 * Wedding Admin - Notification Unread Count API Route
 *
 * GET /api/admin/notifications/unread-count - Get the number of unread notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

/**
 * GET /api/admin/notifications/unread-count
 * Get accurate unread count using relational query
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

    // Calculate accurate unread count using a single count query
    // TrackingEvents that have NO Notification records with read=true
    const unreadCount = await prisma.trackingEvent.count({
      where: {
        wedding_id: user.wedding_id,
        notifications: {
          none: {
            read: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        unread_count: unreadCount,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch unread count',
      },
    }, { status: 500 });
  }
}
