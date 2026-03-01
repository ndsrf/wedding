/**
 * Wedding Admin - Bulk Mark Notifications Read API Route
 *
 * POST /api/admin/notifications/mark-read - Mark multiple notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()),
});

/**
 * POST /api/admin/notifications/mark-read
 * Mark multiple notifications (TrackingEvents) as read
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { ids } = markReadSchema.parse(body);

    if (ids.length === 0) {
      return NextResponse.json({ success: true, count: 0 }, { status: 200 });
    }

    // Get the tracking events to ensure they belong to this wedding
    const trackingEvents = await prisma.trackingEvent.findMany({
      where: {
        id: { in: ids },
        wedding_id: user.wedding_id,
      },
      select: {
        id: true,
        family_id: true,
        event_type: true,
        channel: true,
        metadata: true,
      },
    });

    const foundIds = trackingEvents.map(te => te.id);
    const readAt = new Date();

    // 1. Find existing notifications for these tracking events
    const existingNotifications = await prisma.notification.findMany({
      where: {
        tracking_event_id: { in: foundIds },
        wedding_id: user.wedding_id,
      },
    });

    const existingTrackingEventIds = new Set(existingNotifications.map(n => n.tracking_event_id));
    const toCreate = trackingEvents.filter(te => !existingTrackingEventIds.has(te.id));
    const toUpdate = existingNotifications.filter(n => !n.read);

    await prisma.$transaction([
      // Update existing ones to read
      prisma.notification.updateMany({
        where: {
          id: { in: toUpdate.map(n => n.id) },
        },
        data: {
          read: true,
          read_at: readAt,
        },
      }),
      // Create new ones
      ...toCreate.map(te => prisma.notification.create({
        data: {
          wedding_id: user.wedding_id as string,
          family_id: te.family_id,
          event_type: te.event_type,
          channel: te.channel,
          tracking_event_id: te.id,
          details: {
            original_metadata: te.metadata || {},
            marked_read_by: user.id,
          },
          read: true,
          read_at: readAt,
          admin_id: user.id,
        },
      })),
    ]);

    return NextResponse.json({ success: true, count: foundIds.length }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Invalid IDs' } }, { status: 400 });
    }
    console.error('Error bulk marking notifications as read:', error);
    return NextResponse.json({ success: false, error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Failed to mark notifications as read' } }, { status: 500 });
  }
}
