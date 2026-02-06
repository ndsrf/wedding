/**
 * Wedding Admin - Notifications API Route
 *
 * GET /api/admin/notifications - Get filtered notifications (TrackingEvents) with unread badges
 *
 * Features:
 * - Returns TrackingEvents as notifications
 * - Tracks read status via Notification table (linked via tracking_event_id)
 * - Supports filters: date range, event type, family, channel, read/unread
 * - Sorted by timestamp descending
 * - Includes accurate unread count using efficient relational queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse, PaginatedResponse } from '@/types/api';
import type { Notification } from '@/types/models';
import { API_ERROR_CODES } from '@/types/api';
import type { Prisma } from '@prisma/client';

// Validation schema for query parameters
const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  family_id: z.string().uuid().optional(),
  event_type: z
    .enum([
      'LINK_OPENED',
      'RSVP_STARTED',
      'RSVP_SUBMITTED',
      'RSVP_UPDATED',
      'GUEST_ADDED',
      'PAYMENT_RECEIVED',
      'REMINDER_SENT',
      'INVITATION_SENT',
      'SAVE_THE_DATE_SENT',
      'TASK_ASSIGNED',
      'TASK_COMPLETED',
      'MESSAGE_DELIVERED',
      'MESSAGE_READ',
      'MESSAGE_FAILED',
    ])
    .optional(),
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS']).optional(),
  read: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

/**
 * GET /api/admin/notifications
 * Get filtered notifications (TrackingEvents) with unread badges
 */
export async function GET(request: NextRequest) {
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = listNotificationsQuerySchema.parse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      family_id: searchParams.get('family_id') || undefined,
      event_type: searchParams.get('event_type') || undefined,
      channel: searchParams.get('channel') || undefined,
      read: searchParams.get('read') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
    });

    const { page, limit, family_id, event_type, channel, read, date_from, date_to } =
      queryParams;
    const skip = (page - 1) * limit;

    // Build where clause for filtering TrackingEvents
    const whereClause: Prisma.TrackingEventWhereInput = {
      wedding_id: user.wedding_id,
    };

    if (family_id) {
      whereClause.family_id = family_id;
    }

    if (event_type) {
      whereClause.event_type = event_type;
    }

    if (channel) {
      whereClause.channel = channel;
    }

    if (date_from || date_to) {
      whereClause.timestamp = {};
      if (date_from) {
        whereClause.timestamp.gte = new Date(date_from);
      }
      if (date_to) {
        whereClause.timestamp.lte = new Date(date_to);
      }
    }

    // Handle read filter - use relational filters for better performance
    if (read !== undefined) {
      if (read === true) {
        whereClause.notifications = {
          some: {
            read: true,
          },
        };
      } else {
        whereClause.notifications = {
          none: {
            read: true,
          },
        };
      }
    }

    // Get total count for pagination (after filtering)
    const total = await prisma.trackingEvent.count({ where: whereClause });

    // Fetch tracking events (notifications) sorted by timestamp descending
    // Include the read status via the notifications relation
    const events = await prisma.trackingEvent.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            email: true,
            preferred_language: true,
          },
        },
        notifications: {
          where: {
            read: true,
          },
          select: {
            id: true,
            read_at: true,
          },
          take: 1,
        },
      },
    });

    // Calculate accurate unread count using a single count query
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

    // Transform events to notification format with read status
    const notifications = events.map((event) => {
      const readNotification = event.notifications[0];
      return {
        id: event.id,
        wedding_id: event.wedding_id,
        family_id: event.family_id,
        event_type: event.event_type,
        channel: event.channel,
        details: event.metadata || {},
        read: !!readNotification,
        read_at: readNotification?.read_at || null,
        admin_id: user.id,
        created_at: event.timestamp,
        timestamp: event.timestamp,
        admin_triggered: event.admin_triggered,
        // Include family info
        family: event.family,
      };
    });

    const response: APIResponse<PaginatedResponse<Notification> & { unread_count: number }> = {
      success: true,
      data: {
        items: notifications as unknown as Notification[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        unread_count: unreadCount,
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

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid query parameters',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error fetching notifications:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch notifications',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}