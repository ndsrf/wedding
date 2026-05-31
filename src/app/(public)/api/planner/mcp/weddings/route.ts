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
      select: { id: true, couple_names: true, wedding_date: true },
      orderBy: { wedding_date: 'asc' },
    });

    const weddingIds = weddings.map((w) => w.id);
    const allFamilies = await prisma.family.findMany({
      where: { wedding_id: { in: weddingIds } },
      select: { id: true, wedding_id: true, members: { select: { attending: true } } },
    });

    const familiesByWedding = new Map<string, (typeof allFamilies)[number][]>();
    for (const f of allFamilies) {
      const list = familiesByWedding.get(f.wedding_id) ?? [];
      list.push(f);
      familiesByWedding.set(f.wedding_id, list);
    }

    const results = weddings.map((w) => {
      const families = familiesByWedding.get(w.id) ?? [];
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
    });

    return NextResponse.json(results);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[MCP] planner/weddings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
