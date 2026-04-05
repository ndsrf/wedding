import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const contracts = await prisma.contract.findMany({
      where: {
        planner_id: user.planner_id,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, couple_names: true, email: true } },
        quote: { select: { id: true, couple_names: true, event_date: true, currency: true, total: true } },
        template: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ data: contracts });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
