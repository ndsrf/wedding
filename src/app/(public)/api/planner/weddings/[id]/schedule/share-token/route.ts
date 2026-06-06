import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { prisma } from '@/lib/db/prisma';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id: weddingId } = await params;

  let user;
  try {
    user = await requireRole('planner');
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user.planner_id) {
    return NextResponse.json({ error: 'No planner' }, { status: 403 });
  }

  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;

  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { planner_schedule_token: true },
  });

  let token = wedding?.planner_schedule_token ?? null;

  if (!token) {
    const newToken = randomUUID();
    try {
      // Conditional update: only succeeds if the token is still null.
      // If a concurrent request already set it, Prisma throws P2025
      // (record not found) and we fall through to re-fetch.
      await prisma.wedding.update({
        where: { id: weddingId, planner_schedule_token: null },
        data: { planner_schedule_token: newToken },
      });
      token = newToken;
    } catch {
      const refetched = await prisma.wedding.findUnique({
        where: { id: weddingId },
        select: { planner_schedule_token: true },
      });
      token = refetched?.planner_schedule_token ?? null;
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Failed to generate share token' }, { status: 500 });
  }

  return NextResponse.json({ data: { token } });
}
