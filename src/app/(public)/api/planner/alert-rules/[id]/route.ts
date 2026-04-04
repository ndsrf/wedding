/**
 * Planner — Alert Rule detail API
 *
 * GET    /api/planner/alert-rules/:id   Get a single rule
 * PATCH  /api/planner/alert-rules/:id   Update a rule (partial)
 * DELETE /api/planner/alert-rules/:id   Delete a rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { AlertEventType, Channel } from '@prisma/client';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findOwnedRule(ruleId: string, plannerId: string) {
  return prisma.alertRule.findFirst({
    where: { id: ruleId, planner_id: plannerId },
  });
}

// ── Validation ────────────────────────────────────────────────────────────────

const patchRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  event_type: z.nativeEnum(AlertEventType).optional(),
  wedding_id: z.string().uuid().nullable().optional(),

  notify_master_admin: z.boolean().optional(),
  notify_planner: z.boolean().optional(),
  notify_couple: z.boolean().optional(),
  notify_guest_ids: z.array(z.string().uuid()).optional(),

  channels: z.array(z.nativeEnum(Channel)).min(1).optional(),

  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(2000).optional(),

  enabled: z.boolean().optional(),
  cooldown_minutes: z.number().int().min(1).max(10080).nullable().optional(),
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole('planner');
    const { id } = await params;

    const rule = await findOwnedRule(id, user.id);
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ rule });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole('planner');
    const { id } = await params;

    const existing = await findOwnedRule(id, user.id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const parsed = patchRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // If changing wedding_id, verify ownership
    if (data.wedding_id) {
      const wedding = await prisma.wedding.findFirst({
        where: { id: data.wedding_id, planner_id: user.id },
        select: { id: true },
      });
      if (!wedding) {
        return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
      }
    }

    const rule = await prisma.alertRule.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.event_type !== undefined && { event_type: data.event_type }),
        ...(data.wedding_id !== undefined && { wedding_id: data.wedding_id }),
        ...(data.notify_master_admin !== undefined && { notify_master_admin: data.notify_master_admin }),
        ...(data.notify_planner !== undefined && { notify_planner: data.notify_planner }),
        ...(data.notify_couple !== undefined && { notify_couple: data.notify_couple }),
        ...(data.notify_guest_ids !== undefined && { notify_guest_ids: data.notify_guest_ids }),
        ...(data.channels !== undefined && { channels: data.channels }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.body !== undefined && { body: data.body }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.cooldown_minutes !== undefined && { cooldown_minutes: data.cooldown_minutes }),
      },
    });

    return NextResponse.json({ rule });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole('planner');
    const { id } = await params;

    const existing = await findOwnedRule(id, user.id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.alertRule.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
