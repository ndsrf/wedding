import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

type Params = { params: Promise<{ token: string }> };

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  // Reject empty/malformed values before touching the DB.
  // A blank token would produce OR: [{}, {}] which Prisma treats as "match all".
  if (!token || !TOKEN_RE.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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

  const [scheduleRow, blocks] = await Promise.all([
    prisma.weddingSchedule.findUnique({ where: { wedding_id: wedding.id } }),
    prisma.scheduleBlock.findMany({
      where: { wedding_id: wedding.id, template_id: null },
      orderBy: { order: 'asc' },
      include: {
        stages: {
          // Filter planner-only stages server-side for the couple/admin token
          where: isPlanner ? undefined : { visible_to_couple: true },
          orderBy: { order: 'asc' },
          include: {
            // Only public-safe provider fields — no email, phone, or contact_name
            wedding_provider: {
              select: { id: true, name: true, category: { select: { name: true } } },
            },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    data: {
      schedule: scheduleRow,
      blocks,
      isPlanner,
      coupleNames: wedding.couple_names,
      weddingDate: wedding.wedding_date?.toISOString() ?? null,
      planner: wedding.planner,
    },
  });
}
