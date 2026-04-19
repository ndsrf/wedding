/**
 * MCP — Planner Weddings
 * GET /api/planner/mcp/weddings
 * Auth: Bearer API key (planner role)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKeyAuth } from '@/lib/auth/api-key';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiKeyAuth(request, 'planner');
    if (!ctx.planner_id) {
      return NextResponse.json({ error: 'No planner context' }, { status: 403 });
    }

    const weddings = await prisma.wedding.findMany({
      where: { planner_id: ctx.planner_id },
      select: { id: true, couple_names: true, wedding_date: true, _count: { select: { families: true } } },
      orderBy: { wedding_date: 'asc' },
    });

    const results = await Promise.all(
      weddings.map(async (w) => {
        const families = await prisma.family.findMany({
          where: { wedding_id: w.id },
          include: { members: { select: { attending: true } } },
        });
        const total = families.length;
        const submitted = families.filter((f) => f.members.some((m) => m.attending !== null)).length;
        return {
          id: w.id,
          coupleNames: w.couple_names,
          weddingDate: w.wedding_date.toISOString().split('T')[0],
          totalFamilies: total,
          rsvpSubmitted: submitted,
          rsvpPending: total - submitted,
          completionPct: total > 0 ? Math.round((submitted / total) * 100) : 0,
        };
      }),
    );

    return NextResponse.json(results);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[MCP] planner/weddings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
