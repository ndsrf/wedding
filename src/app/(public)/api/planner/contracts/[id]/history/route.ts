import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const createSchema = z.object({
  actor_name: z.string().min(1).max(100),
  actor_color: z.string().min(1).max(20),
  event_type: z.enum(['edit', 'comment_added', 'comment_resolved']),
  description: z.string().max(500).optional(),
  // Only accepted for edit events; stripped otherwise
  content_snapshot: z.record(z.string(), z.unknown()).optional(),
  share_token: z.string().optional(), // clients authenticate with this
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const contract = await prisma.contract.findFirst({ where: { id, planner_id: user.planner_id } });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const events = await prisma.contractHistoryEvent.findMany({
      where: { contract_id: id },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    return NextResponse.json({ data: events });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    // Determine who is calling
    let plannerUser: { planner_id?: string | null } | null = null;
    try {
      plannerUser = await requireRole('planner');
    } catch {
      // not a planner session — may be a client with share_token
    }

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isPlanner = !!(plannerUser?.planner_id && contract.planner_id === plannerUser.planner_id);
    const isClient = !isPlanner && body?.share_token === contract.share_token;

    if (!isPlanner && !isClient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    const { actor_name, actor_color, event_type, description, content_snapshot } = parsed.data;

    // Clients may only log comment events — edit events require planner auth
    if (!isPlanner && event_type === 'edit') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // content_snapshot is only meaningful for edit events; discard it otherwise
    const snapshot = event_type === 'edit' && content_snapshot
      ? content_snapshot as Prisma.InputJsonValue
      : undefined;

    const event = await prisma.contractHistoryEvent.create({
      data: {
        contract_id: id,
        actor_name,
        actor_color,
        event_type,
        description,
        ...(snapshot !== undefined ? { content_snapshot: snapshot } : {}),
      },
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
