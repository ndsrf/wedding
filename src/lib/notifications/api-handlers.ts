/**
 * Shared Notification API Handlers
 *
 * Contains the full business logic for every notification API operation.
 * Route files (admin and planner) are thin auth-and-dispatch wrappers
 * that call these handlers after resolving the wedding ID and verifying
 * role-specific access.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse, PaginatedResponse } from '@/types/api';
import type { Notification } from '@/types/models';
import { API_ERROR_CODES } from '@/types/api';
import type { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { 
  getCachedNotifications, 
  setCachedNotifications, 
  invalidateAllNotificationCache,
  getCachedUnreadCount,
  getCachedTotalCount,
  getOrSetCachedCount,
  NOTIFICATION_CACHE_KEYS
} from './cache';

// ============================================================================
// SHARED ERROR HANDLER
// ============================================================================

export function handleNotificationApiError(
  error: unknown,
  context: { operation: string },
): NextResponse {
  const msg = error instanceof Error ? error.message : '';

  if (msg.includes('UNAUTHORIZED')) {
    const body: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' },
    };
    return NextResponse.json(body, { status: 401 });
  }

  if (msg.includes('FORBIDDEN')) {
    const body: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Insufficient permissions' },
    };
    return NextResponse.json(body, { status: 403 });
  }

  if (error instanceof z.ZodError) {
    const body: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: `Validation error in ${context.operation}`,
        details: error.errors,
      },
    };
    return NextResponse.json(body, { status: 400 });
  }

  console.error(`Error in ${context.operation}:`, error);
  const body: APIResponse = {
    success: false,
    error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: `Failed to ${context.operation}` },
  };
  return NextResponse.json(body, { status: 500 });
}

// ============================================================================
// SCHEMAS
// ============================================================================

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
      'MESSAGE_RECEIVED',
      'AI_REPLY_SENT',
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

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()),
});

const exportNotificationsSchema = z.object({
  format: z.enum(['excel', 'csv']).default('excel'),
  filters: z
    .object({
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
      date_from: z.string().datetime().optional(),
      date_to: z.string().datetime().optional(),
    })
    .optional(),
});

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * GET /api/{role}/notifications
 * List notifications (TrackingEvents) with read status and unread count.
 */
export async function listNotificationsHandler(
  weddingId: string,
  searchParams: URLSearchParams,
  actorId: string,
): Promise<NextResponse> {
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

  const { page, limit, family_id, event_type, channel, read, date_from, date_to } = queryParams;

  // 1. Try to use Redis cache for the first page with no filters
  const hasFilters = family_id || event_type || channel || read !== undefined || date_from || date_to;
  const isFirstPage = page === 1;
  const cacheSize = parseInt(process.env.NOTIFICATIONS_CACHE_SIZE || '100', 10);

  if (!hasFilters && isFirstPage && limit <= cacheSize) {
    const start = performance.now();
    const [cachedItems, cachedUnread, cachedTotal] = await Promise.all([
      getCachedNotifications(weddingId),
      getCachedUnreadCount(weddingId),
      getCachedTotalCount(weddingId),
    ]);

    if (cachedItems !== null && cachedUnread !== null && cachedTotal !== null) {
      const end = performance.now();
      console.debug(`[Notifications] CACHE HIT for list (page 1, no filters) in ${(end - start).toFixed(2)}ms`);
      
      const response: APIResponse<PaginatedResponse<Notification> & { unread_count: number }> = {
        success: true,
        data: {
          items: cachedItems.slice(0, limit) as unknown as Notification[],
          pagination: { page, limit, total: cachedTotal, totalPages: Math.ceil(cachedTotal / limit) },
          unread_count: cachedUnread,
        },
      };
      return NextResponse.json(response, { status: 200 });
    }
    console.debug(`[Notifications] CACHE MISS for list (page 1, no filters)`);
  }

  const skip = (page - 1) * limit;

  const whereClause: Prisma.TrackingEventWhereInput = { wedding_id: weddingId };

  if (family_id) whereClause.family_id = family_id;
  if (event_type) whereClause.event_type = event_type;
  if (channel) whereClause.channel = channel;

  if (date_from || date_to) {
    whereClause.timestamp = {};
    if (date_from) whereClause.timestamp.gte = new Date(date_from);
    if (date_to) whereClause.timestamp.lte = new Date(date_to);
  }

  if (read !== undefined) {
    whereClause.notifications = read === true
      ? { some: { read: true } }
      : { none: { read: true } };
  }

  let total: number;
  let unreadCount: number;
  
  type TrackingEventWithRelations = Prisma.TrackingEventGetPayload<{
    include: {
      family: { select: { id: true, name: true, email: true, preferred_language: true } },
      notifications: {
        where: { read: true },
        select: { id: true, read_at: true },
        take: 1,
      },
    },
  }>;

  let events: TrackingEventWithRelations[];

  if (!hasFilters) {
    // Use stampede-protected caching for default counts
    [total, unreadCount, events] = await Promise.all([
      getOrSetCachedCount(NOTIFICATION_CACHE_KEYS.totalCount(weddingId), () => 
        prisma.trackingEvent.count({ where: { wedding_id: weddingId } })
      ),
      getOrSetCachedCount(NOTIFICATION_CACHE_KEYS.unreadCount(weddingId), () => 
        prisma.trackingEvent.count({
          where: {
            wedding_id: weddingId,
            notifications: { none: { read: true } },
          },
        })
      ),
      prisma.trackingEvent.findMany({
        where: whereClause,
        skip,
        take: Math.max(limit, cacheSize),
        orderBy: { timestamp: 'desc' },
        include: {
          family: { select: { id: true, name: true, email: true, preferred_language: true } },
          notifications: {
            where: { read: true },
            select: { id: true, read_at: true },
            take: 1,
          },
        },
      }),
    ]);
  } else {
    // Dynamic query - no caching for filters for now
    [total, events, unreadCount] = await Promise.all([
      prisma.trackingEvent.count({ where: whereClause }),
      prisma.trackingEvent.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          family: { select: { id: true, name: true, email: true, preferred_language: true } },
          notifications: {
            where: { read: true },
            select: { id: true, read_at: true },
            take: 1,
          },
        },
      }),
      prisma.trackingEvent.count({
        where: {
          wedding_id: weddingId,
          notifications: { none: { read: true } },
        },
      }),
    ]);
  }

  const notifications = events.map((event) => {
    const readNotification = event.notifications[0];
    return {
      id: event.id,
      wedding_id: event.wedding_id,
      family_id: event.family_id,
      event_type: event.event_type,
      channel: event.channel,
      details: (event.metadata as Record<string, unknown>) || {},
      read: !!readNotification,
      read_at: readNotification?.read_at || null,
      admin_id: actorId,
      created_at: event.timestamp,
      timestamp: event.timestamp,
      admin_triggered: event.admin_triggered,
      family: event.family,
    };
  });

  // 2. Update list cache if this was a "default" query
  if (!hasFilters) {
    await setCachedNotifications(weddingId, notifications as unknown as Notification[]);
  }

  const response: APIResponse<PaginatedResponse<Notification> & { unread_count: number }> = {
    success: true,
    data: {
      items: notifications.slice(0, limit) as unknown as Notification[],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      unread_count: unreadCount,
    },
  };

  return NextResponse.json(response, { status: 200 });
}

/**
 * PATCH /api/{role}/notifications/:id/read
 * Mark a single notification (TrackingEvent) as read.
 */
export async function markNotificationReadHandler(
  weddingId: string,
  trackingEventId: string,
  actorId: string,
): Promise<NextResponse> {
  const trackingEvent = await prisma.trackingEvent.findFirst({
    where: { id: trackingEventId, wedding_id: weddingId },
  });

  if (!trackingEvent) {
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Notification not found' },
    };
    return NextResponse.json(response, { status: 404 });
  }

  const existingNotification = await prisma.notification.findFirst({
    where: { wedding_id: weddingId, tracking_event_id: trackingEventId },
  });

  if (existingNotification) {
    const updatedNotification = await prisma.notification.update({
      where: { id: existingNotification.id },
      data: { read: true, read_at: new Date() },
    });

    // Invalidate cache
    await invalidateAllNotificationCache(weddingId);

    return NextResponse.json(
      {
        success: true,
        data: { ...updatedNotification, details: (updatedNotification.details as Record<string, unknown>) || {} },
      },
      { status: 200 },
    );
  }

  const readAt = new Date();
  const newNotification = await prisma.notification.create({
    data: {
      wedding_id: trackingEvent.wedding_id,
      family_id: trackingEvent.family_id,
      event_type: trackingEvent.event_type,
      channel: trackingEvent.channel,
      tracking_event_id: trackingEventId,
      details: { original_metadata: trackingEvent.metadata || {}, marked_read_by: actorId },
      read: true,
      read_at: readAt,
      admin_id: actorId,
    },
  });

  // Invalidate cache
  await invalidateAllNotificationCache(weddingId);

  return NextResponse.json(
    {
      success: true,
      data: { ...newNotification, details: (newNotification.details as Record<string, unknown>) || {} },
    },
    { status: 200 },
  );
}

/**
 * POST /api/{role}/notifications/mark-read
 * Bulk-mark notifications (TrackingEvents) as read.
 */
export async function bulkMarkNotificationsReadHandler(
  weddingId: string,
  body: unknown,
  actorId: string,
): Promise<NextResponse> {
  const { ids } = markReadSchema.parse(body);

  if (ids.length === 0) {
    return NextResponse.json({ success: true, count: 0 }, { status: 200 });
  }

  const trackingEvents = await prisma.trackingEvent.findMany({
    where: { id: { in: ids }, wedding_id: weddingId },
    select: { id: true, family_id: true, event_type: true, channel: true, metadata: true },
  });

  const foundIds = trackingEvents.map((te) => te.id);
  const readAt = new Date();

  const existingNotifications = await prisma.notification.findMany({
    where: { tracking_event_id: { in: foundIds }, wedding_id: weddingId },
  });

  const existingTrackingEventIds = new Set(existingNotifications.map((n) => n.tracking_event_id));
  const toCreate = trackingEvents.filter((te) => !existingTrackingEventIds.has(te.id));
  const toUpdate = existingNotifications.filter((n) => !n.read);

  await prisma.$transaction([
    prisma.notification.updateMany({
      where: { id: { in: toUpdate.map((n) => n.id) } },
      data: { read: true, read_at: readAt },
    }),
    ...toCreate.map((te) =>
      prisma.notification.create({
        data: {
          wedding_id: weddingId,
          family_id: te.family_id,
          event_type: te.event_type,
          channel: te.channel,
          tracking_event_id: te.id,
          details: { original_metadata: te.metadata || {}, marked_read_by: actorId },
          read: true,
          read_at: readAt,
          admin_id: actorId,
        },
      }),
    ),
  ]);

  // Invalidate cache
  await invalidateAllNotificationCache(weddingId);

  return NextResponse.json({ success: true, count: foundIds.length }, { status: 200 });
}

/**
 * POST /api/{role}/notifications/export
 * Export notifications to Excel or CSV.
 */
export async function exportNotificationsHandler(
  weddingId: string,
  _request: NextRequest,
): Promise<NextResponse> {
  const body = await _request.json();
  const { format, filters } = exportNotificationsSchema.parse(body);

  const whereClause: Prisma.TrackingEventWhereInput = { wedding_id: weddingId };

  if (filters?.family_id) whereClause.family_id = filters.family_id;
  if (filters?.event_type) whereClause.event_type = filters.event_type;
  if (filters?.channel) whereClause.channel = filters.channel;

  if (filters?.date_from || filters?.date_to) {
    whereClause.timestamp = {};
    if (filters.date_from) whereClause.timestamp.gte = new Date(filters.date_from);
    if (filters.date_to) whereClause.timestamp.lte = new Date(filters.date_to);
  }

  const events = await prisma.trackingEvent.findMany({
    where: whereClause,
    orderBy: { timestamp: 'desc' },
    include: { family: { select: { name: true, email: true } } },
  });

  const exportData = events.map((event) => ({
    Date: event.timestamp.toISOString(),
    'Event Type': event.event_type,
    'Family Name': event.family.name,
    'Family Email': event.family.email || '',
    Channel: event.channel || '',
    'Admin Triggered': event.admin_triggered ? 'Yes' : 'No',
    Details: JSON.stringify(event.metadata || {}),
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 25 },
    { wch: 30 },
    { wch: 12 },
    { wch: 15 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Notifications');

  let buffer: Buffer;
  let contentType: string;
  let filename: string;

  if (format === 'csv') {
    const csvData = XLSX.utils.sheet_to_csv(worksheet);
    buffer = Buffer.from(csvData, 'utf-8');
    contentType = 'text/csv';
    filename = `notifications-${new Date().toISOString().split('T')[0]}.csv`;
  } else {
    buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    filename = `notifications-${new Date().toISOString().split('T')[0]}.xlsx`;
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
