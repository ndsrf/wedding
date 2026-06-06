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

  let token = wedding?.planner_schedule_token;
  if (!token) {
    token = randomUUID();
    await prisma.wedding.update({
      where: { id: weddingId },
      data: { planner_schedule_token: token },
    });
  }

  return NextResponse.json({ data: { token } });
}
