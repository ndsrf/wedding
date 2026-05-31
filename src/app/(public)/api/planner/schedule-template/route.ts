/**
 * Planner Schedule Template API
 *
 * GET    /api/planner/schedule-template           — fetch template (or seed default)
 * POST   /api/planner/schedule-template           — create block or stage
 * PATCH  /api/planner/schedule-template           — update block or stage
 * DELETE /api/planner/schedule-template           — delete block or stage
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import {
  getScheduleTemplate,
  createBlock,
  updateBlock,
  deleteBlock,
  createStage,
  updateStage,
  deleteStage,
  reorderBlocks,
  reorderStages,
} from '@/lib/schedule/crud';
import { ensureScheduleTemplate } from '@/lib/schedule/template';

// ── Validation schemas ────────────────────────────────────────────────────────

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
});

const updateBlockSchema = z.object({
  type: z.literal('block'),
  block_id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  order: z.number().int().min(0).optional(),
  color: z.string().optional(),
});

const updateStageSchema = z.object({
  type: z.literal('stage'),
  stage_id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  duration_minutes: z.number().int().min(1).max(1440).optional(),
  order: z.number().int().min(0).optional(),
  notes: z.string().max(1000).nullable().optional(),
  visible_to_couple: z.boolean().optional(),
});

const deleteSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('block'), block_id: z.string().uuid() }),
  z.object({ type: z.literal('stage'), stage_id: z.string().uuid() }),
]);

const reorderSchema = z.object({
  type: z.literal('reorder'),
  entity: z.enum(['blocks', 'stages']),
  updates: z.array(z.object({ id: z.string().uuid(), order: z.number().int().min(0) })),
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await requireRole('planner');
    await ensureScheduleTemplate(user.planner_id!);
    const template = await getScheduleTemplate(user.planner_id!);
    return NextResponse.json({ data: template });
  } catch (err) {
    if ((err as Error).message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[schedule-template GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('planner');
    const body = await req.json();

    // Ensure template exists first
    const template = await ensureScheduleTemplate(user.planner_id!);

    if (body.type === 'block') {
      const parsed = createBlockSchema.parse(body);
      const block = await createBlock({ ...parsed, template_id: template.id });
      return NextResponse.json({ data: block }, { status: 201 });
    }

    if (body.type === 'stage') {
      const parsed = createStageSchema.parse(body);
      const stage = await createStage(parsed);
      return NextResponse.json({ data: stage }, { status: 201 });
    }

    if (body.type === 'reorder') {
      const parsed = reorderSchema.parse(body);
      if (parsed.entity === 'blocks') {
        await reorderBlocks(parsed.updates);
      } else {
        await reorderStages(parsed.updates);
      }
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    if ((err as Error).message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 422 });
    }
    console.error('[schedule-template POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    await requireRole('planner');
    const body = await req.json();

    if (body.type === 'block') {
      const parsed = updateBlockSchema.parse(body);
      const block = await updateBlock(parsed);
      return NextResponse.json({ data: block });
    }

    if (body.type === 'stage') {
      const parsed = updateStageSchema.parse(body);
      const stage = await updateStage(parsed);
      return NextResponse.json({ data: stage });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    if ((err as Error).message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 422 });
    }
    console.error('[schedule-template PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    await requireRole('planner');
    const body = await req.json();
    const parsed = deleteSchema.parse(body);

    if (parsed.type === 'block') {
      await deleteBlock(parsed.block_id);
    } else {
      await deleteStage(parsed.stage_id);
    }

    return NextResponse.json({ data: null });
  } catch (err) {
    if ((err as Error).message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 422 });
    }
    console.error('[schedule-template DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
