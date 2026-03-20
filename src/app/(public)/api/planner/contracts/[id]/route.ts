import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['DRAFT', 'SHARED', 'SIGNING', 'SIGNED', 'CANCELLED']).optional(),
  signer_email: z.string().email().optional().nullable(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, planner_id: user.planner_id },
      include: { quote: { select: { id: true, couple_names: true, client_email: true } }, template: true },
    });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: contract });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.contract.findFirst({ where: { id, planner_id: user.planner_id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content as Prisma.InputJsonValue }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.signer_email !== undefined && { signer_email: data.signer_email }),
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
