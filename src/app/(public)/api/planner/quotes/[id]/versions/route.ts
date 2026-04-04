import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const anchor = await prisma.quote.findFirst({
      where: { id, planner_id: user.planner_id },
      select: { id: true, version: true, status: true, created_at: true, previous_version_id: true },
    });
    if (!anchor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Walk the chain backward from the anchor to collect all versions
    const chain: typeof anchor[] = [anchor];
    let current = anchor;
    while (current.previous_version_id) {
      const prev = await prisma.quote.findFirst({
        where: { id: current.previous_version_id, planner_id: user.planner_id },
        select: { id: true, version: true, status: true, created_at: true, previous_version_id: true },
      });
      if (!prev) break;
      chain.push(prev);
      current = prev;
    }

    // Return ascending by version (oldest first)
    chain.sort((a, b) => a.version - b.version);

    return NextResponse.json({ data: chain });
  } catch (error) {
    console.error('GET /api/planner/quotes/[id]/versions error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
