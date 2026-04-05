/**
 * Master Admin — Global Alert Rules API
 *
 * GET  /api/master/alert-rules   List all global rules (no planner_id / wedding_id)
 * POST /api/master/alert-rules   Create a global rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { AlertEventType, Channel } from '@prisma/client';

const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  event_type: z.nativeEnum(AlertEventType),

  notify_master_admin: z.boolean().default(false),
  notify_planner: z.boolean().default(false),
  notify_couple: z.boolean().default(false),

  channels: z.array(z.nativeEnum(Channel)).min(1),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),

  enabled: z.boolean().default(true),
  cooldown_minutes: z.number().int().min(1).max(10080).optional().nullable(),
});

export async function GET(_req: NextRequest) {
  try {
    await requireRole('master_admin');

    const rules = await prisma.alertRule.findMany({
      where: { planner_id: null, wedding_id: null },
      include: { _count: { select: { alerts: true } } },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ rules });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('master_admin');

    const body = await req.json();
    const parsed = createRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    const rule = await prisma.alertRule.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        event_type: data.event_type,
        planner_id: null,
        wedding_id: null,
        notify_master_admin: data.notify_master_admin,
        notify_planner: data.notify_planner,
        notify_couple: data.notify_couple,
        notify_guest_ids: [],
        channels: data.channels,
        subject: data.subject,
        body: data.body,
        enabled: data.enabled,
        cooldown_minutes: data.cooldown_minutes ?? null,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
