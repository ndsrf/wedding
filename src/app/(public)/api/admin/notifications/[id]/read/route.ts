/**
 * Wedding Admin - Mark Notification Read API Route
 *
 * PATCH /api/admin/notifications/:id/read - Mark notification as read
 *
 * Features:
 * - Marks a TrackingEvent as read by creating a Notification record
 * - Stores tracking_event_id in details for linking back
 * - Records read timestamp
 * - Prevents duplicate read records
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse, MarkNotificationReadResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/notifications/:id/read
 * Mark a notification (TrackingEvent) as read with timestamp
 */
export async function PATCH(_request: NextRequest, context: RouteParams) {
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

    const { id: trackingEventId } = await context.params;

    // First, check if TrackingEvent exists
    const trackingEvent = await prisma.trackingEvent.findFirst({
      where: {
        id: trackingEventId,
        wedding_id: user.wedding_id,
      },
    });

    if (!trackingEvent) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Notification not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if already marked as read (notification with this tracking_event_id exists)
    const existingNotification = await prisma.notification.findFirst({
      where: {
        wedding_id: user.wedding_id,
        tracking_event_id: trackingEventId,
      },
    });

    if (existingNotification) {
      // Already read, update the read_at timestamp
      const updatedNotification = await prisma.notification.update({
        where: { id: existingNotification.id },
        data: {
          read: true,
          read_at: new Date(),
        },
      });

      const response: MarkNotificationReadResponse = {
        success: true,
        data: {
          ...updatedNotification,
          details: (updatedNotification.details as Record<string, unknown>) || {},
        },
      };

      return NextResponse.json(response, { status: 200 });
    }

    // Create a new Notification record to track read status
    // Store tracking_event_id in its own field for performance
    const readAt = new Date();
    const newNotification = await prisma.notification.create({
      data: {
        wedding_id: trackingEvent.wedding_id,
        family_id: trackingEvent.family_id,
        event_type: trackingEvent.event_type,
        channel: trackingEvent.channel,
        tracking_event_id: trackingEventId,
        details: {
          original_metadata: trackingEvent.metadata || {},
          marked_read_by: user.id,
        },
        read: true,
        read_at: readAt,
        admin_id: user.id,
      },
    });

    const response: MarkNotificationReadResponse = {
      success: true,
      data: {
        ...newNotification,
        details: (newNotification.details as Record<string, unknown>) || {},
      },
    };

    return NextResponse.json(response, { status: 200 });
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
    console.error('Error marking notification as read:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to mark notification as read',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
