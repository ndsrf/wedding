import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export interface PlaceholderRule {
  placeholder: string;
  description: string;
  rememberedAt: string;
}

const bodySchema = z.object({
  placeholder: z.string().min(1),
  description: z.string(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const template = await prisma.contractTemplate.findFirst({
      where: { id, planner_id: user.planner_id },
    });
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const { placeholder, description } = bodySchema.parse(body);

    const existing = (template.placeholder_rules ?? []) as PlaceholderRule[];
    // Upsert: replace existing rule for the same placeholder, or add new
    const filtered = existing.filter((r) => r.placeholder !== placeholder);
    const newRule: PlaceholderRule = { placeholder, description, rememberedAt: new Date().toISOString() };
    const updated = [...filtered, newRule];

    const result = await prisma.contractTemplate.update({
      where: { id },
      data: { placeholder_rules: updated },
    });

    return NextResponse.json({ data: result.placeholder_rules });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
