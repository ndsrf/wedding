/**
 * Wedding Admin — Alert History API
 *
 * GET /api/admin/alert-history
 *   Returns alerts and their delivery statuses for the authenticated admin's wedding.
 *   Query params:
 *     page         (default 1)
 *     limit        (default 20, max 100)
 *     event_type   (optional filter)
 *     status       (optional filter: PENDING | PROCESSING | COMPLETED | PARTIAL | FAILED)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { AlertEventType, AlertStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));
    const eventTypeParam = searchParams.get('event_type');
    const statusParam = searchParams.get('status');

    const event_type = eventTypeParam && eventTypeParam in AlertEventType
      ? (eventTypeParam as AlertEventType)
      : undefined;

    const status = statusParam && statusParam in AlertStatus
      ? (statusParam as AlertStatus)
      : undefined;

    const wedding_id = user.wedding_id;
    if (!wedding_id) {
      return NextResponse.json({ error: 'No wedding associated with this account' }, { status: 400 });
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where: {
          wedding_id,
          ...(event_type && { event_type }),
          ...(status && { status }),
        },
        include: {
          rule: { select: { id: true, name: true, event_type: true } },
          deliveries: {
            select: {
              id: true,
              recipient_type: true,
              recipient_name: true,
              channel: true,
              status: true,
              attempts: true,
              max_attempts: true,
              sent_at: true,
              failed_at: true,
              last_error: true,
              created_at: true,
            },
            orderBy: { created_at: 'asc' },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.alert.count({
        where: {
          wedding_id,
          ...(event_type && { event_type }),
          ...(status && { status }),
        },
      }),
    ]);

    return NextResponse.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[alert-history GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
