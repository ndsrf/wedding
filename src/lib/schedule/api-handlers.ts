/**
 * Shared Schedule API Handlers
 *
 * Business logic extracted from route files so both the admin and planner routes
 * become thin auth-and-dispatch wrappers, following the CONSOLIDATION_PLAN.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { prisma } from '@/lib/db/prisma';
import {
  getWeddingSchedule,
  createBlock,
  updateBlock,
  createStage,
  updateStage,
  upsertWeddingSchedule,
  reorderBlocks,
  reorderStages,
} from './crud';
import { applyScheduleToWedding } from './template';
import { computeScheduleWithTimes } from '@/types/schedule';
import { SchedulePDF } from '@/lib/pdf/schedule-pdf';

// ── Schemas ───────────────────────────────────────────────────────────────────

const upsertScheduleSchema = z.object({
  type: z.literal('schedule'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(2000).nullable().optional(),
});

const createBlockSchema = z.object({
  type: z.literal('block'),
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
  color: z.string().optional(),
});

const createStageSchema = z.object({
  type: z.literal('stage'),
  block_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  duration_minutes: z.number().int().min(1).max(1440),
  order: z.number().int().min(0),
  notes: z.string().max(1000).nullable().optional(),
  visible_to_couple: z.boolean().optional(),
  wedding_provider_id: z.string().uuid().nullable().optional(),
});

const reorderSchema = z.object({
  type: z.literal('reorder'),
  entity: z.enum(['blocks', 'stages']),
  updates: z.array(z.object({ id: z.string().uuid(), order: z.number().int().min(0) })),
});

const patchBlockSchema = z.object({
  type: z.literal('block'),
  block_id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  order: z.number().int().min(0).optional(),
  color: z.string().optional(),
  offset_minutes: z.number().int().min(0).nullable().optional(),
});

const patchStageSchema = z.object({
  type: z.literal('stage'),
  stage_id: z.string().uuid(),
  block_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  duration_minutes: z.number().int().min(1).max(1440).optional(),
  order: z.number().int().min(0).optional(),
  notes: z.string().max(1000).nullable().optional(),
  visible_to_couple: z.boolean().optional(),
  wedding_provider_id: z.string().uuid().nullable().optional(),
});

const patchScheduleSchema = z.object({
  type: z.literal('schedule'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(2000).nullable().optional(),
});

const deleteSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('block'), block_id: z.string().uuid() }),
  z.object({ type: z.literal('stage'), stage_id: z.string().uuid() }),
]);

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function getScheduleHandler(weddingId: string): Promise<NextResponse> {
  const data = await getWeddingSchedule(weddingId);
  return NextResponse.json({ data });
}

export async function postScheduleHandler(
  weddingId: string,
  plannerId: string,
  body: unknown
): Promise<NextResponse> {
  const b = body as Record<string, unknown>;

  if (b.type === 'apply_template') {
    await applyScheduleToWedding(plannerId, weddingId, (b.start_time as string) ?? '10:00');
    const data = await getWeddingSchedule(weddingId);
    return NextResponse.json({ data }, { status: 201 });
  }

  if (b.type === 'schedule') {
    const parsed = upsertScheduleSchema.parse(b);
    const schedule = await upsertWeddingSchedule(weddingId, { start_time: parsed.start_time, notes: parsed.notes });
    return NextResponse.json({ data: schedule }, { status: 201 });
  }

  if (b.type === 'block') {
    const parsed = createBlockSchema.parse(b);
    const block = await createBlock({ name: parsed.name, order: parsed.order, color: parsed.color, wedding_id: weddingId });
    return NextResponse.json({ data: block }, { status: 201 });
  }

  if (b.type === 'stage') {
    const { block_id, name, duration_minutes, order, notes, visible_to_couple, wedding_provider_id } = createStageSchema.parse(b);
    const stage = await createStage({ block_id, name, duration_minutes, order, notes, visible_to_couple, wedding_provider_id });
    return NextResponse.json({ data: stage }, { status: 201 });
  }

  if (b.type === 'reorder') {
    const parsed = reorderSchema.parse(b);
    if (parsed.entity === 'blocks') {
      await reorderBlocks(parsed.updates);
    } else {
      await reorderStages(parsed.updates);
    }
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function patchScheduleHandler(
  weddingId: string,
  body: unknown
): Promise<NextResponse> {
  const b = body as Record<string, unknown>;

  if (b.type === 'schedule') {
    const { start_time, notes } = patchScheduleSchema.parse(b);
    const schedule = await upsertWeddingSchedule(weddingId, { start_time, notes });
    return NextResponse.json({ data: schedule });
  }

  if (b.type === 'block') {
    const { block_id, name, order, color, offset_minutes } = patchBlockSchema.parse(b);
    const existingBlock = await prisma.scheduleBlock.findFirst({ where: { id: block_id, wedding_id: weddingId } });
    if (!existingBlock) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const block = await updateBlock({ block_id, name, order, color, offset_minutes });
    return NextResponse.json({ data: block });
  }

  if (b.type === 'stage') {
    const { stage_id, block_id, name, duration_minutes, order, notes, visible_to_couple, wedding_provider_id } = patchStageSchema.parse(b);
    const existingStage = await prisma.scheduleStage.findFirst({ where: { id: stage_id, block: { wedding_id: weddingId } } });
    if (!existingStage) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const stage = await updateStage({ stage_id, block_id, name, duration_minutes, order, notes, visible_to_couple, wedding_provider_id });
    return NextResponse.json({ data: stage });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function deleteScheduleHandler(weddingId: string, body: unknown): Promise<NextResponse> {
  const parsed = deleteSchema.parse(body);
  if (parsed.type === 'block') {
    const result = await prisma.scheduleBlock.deleteMany({
      where: { id: parsed.block_id, wedding_id: weddingId },
    });
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } else {
    const result = await prisma.scheduleStage.deleteMany({
      where: { id: parsed.stage_id, block: { wedding_id: weddingId } },
    });
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ data: null });
}

export function scheduleZodError(err: unknown): NextResponse | null {
  if (err instanceof z.ZodError) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
  return null;
}

export async function getSchedulePdfHandler(
  weddingId: string,
  viewMode: 'planner' | 'couple'
): Promise<NextResponse> {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: {
      couple_names: true,
      wedding_date: true,
      planner: { select: { name: true, logo_url: true } },
      itinerary_items: {
        orderBy: { date_time: 'asc' },
        select: {
          id: true,
          date_time: true,
          item_type: true,
          notes: true,
          location: { select: { name: true, address: true } },
        },
      },
    },
  });

  const { schedule, blocks } = await getWeddingSchedule(weddingId);
  const start_time = schedule?.start_time ?? '08:00';
  const blocksWithTimes = computeScheduleWithTimes(blocks, start_time);

  const pdfBuffer = await renderToBuffer(
    React.createElement(SchedulePDF, {
      blocks: blocksWithTimes,
      coupleNames: wedding?.couple_names ?? '',
      weddingDate: wedding?.wedding_date
        ? new Date(wedding.wedding_date).toLocaleDateString('es-ES')
        : null,
      startTime: start_time,
      viewMode,
      plannerName: wedding?.planner?.name,
      plannerLogo: wedding?.planner?.logo_url ?? null,
      itineraryItems: wedding ? wedding.itinerary_items.map((item: {
        id: string;
        date_time: Date;
        item_type: string;
        notes: string | null;
        location: { name: string; address: string | null };
      }) => ({
        id: item.id,
        dateTime: item.date_time.toISOString(),
        itemType: item.item_type,
        locationName: item.location.name,
        address: item.location.address ?? null,
        notes: item.notes ?? null,
      })) : [],
    }) as unknown as Parameters<typeof renderToBuffer>[0]
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cronograma-${viewMode}.pdf"`,
    },
  });
}
