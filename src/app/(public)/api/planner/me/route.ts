import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(200),
});

export async function GET() {
  try {
    const user = await requireRole('planner');
    return NextResponse.json({ name: user.name ?? 'Planner', email: user.email });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      return NextResponse.json({ error: 'Planner ID not found' }, { status: 403 });
    }
    const body = await request.json();
    const { name } = updateProfileSchema.parse(body);
    const updated = await prisma.weddingPlanner.update({
      where: { id: user.planner_id },
      data: { name },
      select: { name: true, email: true },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('UNAUTHORIZED')) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (message.startsWith('FORBIDDEN')) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    console.error('Error updating planner profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
