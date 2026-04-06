import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(50).nullable().optional(),
  bank_account: z.string().max(50).nullable().optional(),
  accepts_bizum: z.boolean().optional(),
  accepts_revolut: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireRole('planner');
    let preferred_language: string | null = null;
    if (user.planner_id) {
      const planner = await prisma.weddingPlanner.findUnique({
        where: { id: user.planner_id },
        select: { preferred_language: true },
      });
      preferred_language = planner?.preferred_language ?? null;
    }
    return NextResponse.json({ name: user.name ?? 'Planner', email: user.email, preferred_language });
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
    const validated = updateProfileSchema.parse(body);
    const updated = await prisma.weddingPlanner.update({
      where: { id: user.planner_id },
      data: {
        name: validated.name,
        ...(validated.phone !== undefined && { phone: validated.phone }),
        ...(validated.bank_account !== undefined && { bank_account: validated.bank_account }),
        ...(validated.accepts_bizum !== undefined && { accepts_bizum: validated.accepts_bizum }),
        ...(validated.accepts_revolut !== undefined && { accepts_revolut: validated.accepts_revolut }),
      },
      select: { name: true, email: true, phone: true, bank_account: true, accepts_bizum: true, accepts_revolut: true },
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
