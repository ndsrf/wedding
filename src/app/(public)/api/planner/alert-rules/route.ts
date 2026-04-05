/**
 * Planner — Alert Rules API
 *
 * GET  /api/planner/alert-rules          List rules for the planner (optionally filtered by wedding_id)
 * POST /api/planner/alert-rules          Create a new rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { AlertEventType, Channel } from '@prisma/client';

// ── Validation ────────────────────────────────────────────────────────────────

const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  event_type: z.nativeEnum(AlertEventType),
  wedding_id: z.string().uuid().optional().nullable(),

  notify_master_admin: z.boolean().default(false),
  notify_planner: z.boolean().default(false),
  notify_couple: z.boolean().default(false),
  notify_guest_ids: z.array(z.string().uuid()).default([]),

  channels: z.array(z.nativeEnum(Channel)).min(1, 'At least one channel required'),

  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),

  enabled: z.boolean().default(true),
  cooldown_minutes: z.number().int().min(1).max(10080).optional().nullable(), // max 1 week
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('planner');

    const { searchParams } = new URL(req.url);
    const wedding_id = searchParams.get('wedding_id') ?? undefined;

    const rules = await prisma.alertRule.findMany({
      where: {
        planner_id: user.id,
        ...(wedding_id ? { OR: [{ wedding_id }, { wedding_id: null }] } : {}),
      },
      include: {
        _count: { select: { alerts: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ rules });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[alert-rules GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('planner');

    const body = await req.json();
    const parsed = createRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // If a wedding_id is provided, verify it belongs to this planner
    if (data.wedding_id) {
      const wedding = await prisma.wedding.findFirst({
        where: { id: data.wedding_id, planner_id: user.id },
        select: { id: true },
      });
      if (!wedding) {
        return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
      }
    }

    const rule = await prisma.alertRule.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        event_type: data.event_type,
        planner_id: user.id,
        wedding_id: data.wedding_id ?? null,
        notify_master_admin: data.notify_master_admin,
        notify_planner: data.notify_planner,
        notify_couple: data.notify_couple,
        notify_guest_ids: data.notify_guest_ids,
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
    console.error('[alert-rules POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
