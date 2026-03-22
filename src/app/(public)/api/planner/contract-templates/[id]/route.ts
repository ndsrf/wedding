import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  is_default: z.boolean().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const template = await prisma.contractTemplate.findFirst({
      where: { id, planner_id: user.planner_id },
    });
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: template });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.contractTemplate.findFirst({ where: { id, planner_id: user.planner_id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const data = updateSchema.parse(body);

    if (data.is_default) {
      await prisma.contractTemplate.updateMany({
        where: { planner_id: user.planner_id, is_default: true },
        data: { is_default: false },
      });
    }

    const updated = await prisma.contractTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.content !== undefined && { content: data.content as Prisma.InputJsonValue }),
        ...(data.is_default !== undefined && { is_default: data.is_default }),
        // Wipe remembered placeholder rules whenever the template body changes —
        // the placeholders themselves may have been added, removed, or renamed.
        ...(data.content !== undefined && { placeholder_rules: Prisma.JsonNull }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.contractTemplate.findFirst({ where: { id, planner_id: user.planner_id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.contractTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
