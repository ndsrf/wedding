/**
 * Wedding Admin - Notifications API Route
 *
 * GET /api/admin/notifications - Get filtered notifications (TrackingEvents) with unread badges
 *
 * Features:
 * - Returns TrackingEvents as notifications
 * - Tracks read status via Notification table (linking tracking_event_id in details)
 * - Supports filters: date range, event type, family, channel, read/unread
 * - Sorted by timestamp descending
 * - Includes accurate unread count
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/src/lib/auth/middleware';
import type { APIResponse, PaginatedResponse } from '@/src/types/api';
import type { Notification } from '@/src/types/models';
import { API_ERROR_CODES } from '@/src/types/api';
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

    // Get all notifications that track read status for this wedding
    // The Notification table stores tracking_event_id in the details JSONB field
    const readNotifications = await prisma.notification.findMany({
      where: {
        wedding_id: user.wedding_id,
        read: true,
      },
      select: {
        details: true,
      },
    });

    // Extract tracking_event_ids that have been marked as read
    const readTrackingEventIds = new Set<string>(
      readNotifications
        .map((n) => {
          const details = n.details as { tracking_event_id?: string } | null;
          return details?.tracking_event_id;
        })
        .filter((id): id is string => id !== undefined && id !== null)
    );

    // Handle read filter - filter tracking events by read status
    if (read !== undefined) {
      if (read === true) {
        // Only show read events
        if (readTrackingEventIds.size > 0) {
          whereClause.id = { in: Array.from(readTrackingEventIds) };
        } else {
          // No read events, return empty
          whereClause.id = { in: [] };
        }
      } else {
        // Only show unread events
        if (readTrackingEventIds.size > 0) {
          whereClause.id = { notIn: Array.from(readTrackingEventIds) };
        }
        // If no read events, don't add filter (all are unread)
      }
    }

    // Get total count for pagination (after filtering)
    const total = await prisma.trackingEvent.count({ where: whereClause });

    // Fetch tracking events (notifications) sorted by timestamp descending
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
      },
    });

    // Calculate accurate unread count (total events not marked as read)
    const totalEventsCount = await prisma.trackingEvent.count({
      where: { wedding_id: user.wedding_id },
    });
    const unreadCount = totalEventsCount - readTrackingEventIds.size;

    // Transform events to notification format with read status
    const notifications = events.map((event) => {
      const isRead = readTrackingEventIds.has(event.id);
      return {
        id: event.id,
        wedding_id: event.wedding_id,
        family_id: event.family_id,
        event_type: event.event_type,
        channel: event.channel,
        details: event.metadata || {},
        read: isRead,
        read_at: null, // Would need to join with Notification table to get this
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
