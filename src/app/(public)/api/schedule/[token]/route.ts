import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getWeddingSchedule } from '@/lib/schedule/crud';

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  const wedding = await prisma.wedding.findFirst({
    where: {
      OR: [
        { admin_schedule_token: token },
        { planner_schedule_token: token },
      ],
    },
    select: {
      id: true,
      couple_names: true,
      wedding_date: true,
      admin_schedule_token: true,
      planner_schedule_token: true,
      planner: { select: { name: true, logo_url: true } },
    },
  });

  if (!wedding) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isPlanner = wedding.planner_schedule_token === token;
  const { schedule, blocks } = await getWeddingSchedule(wedding.id);

  return NextResponse.json({
    data: {
      schedule,
      blocks,
      isPlanner,
      coupleNames: wedding.couple_names,
      weddingDate: wedding.wedding_date?.toISOString() ?? null,
      planner: wedding.planner,
    },
  });
}
