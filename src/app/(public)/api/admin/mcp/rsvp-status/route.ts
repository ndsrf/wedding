/**
 * MCP — RSVP Status Summary
 * GET /api/admin/mcp/rsvp-status
 * Auth: Bearer API key (wedding_admin role)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKeyAuth } from '@/lib/auth/api-key';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireApiKeyAuth(request, 'wedding_admin');
    if (!ctx.wedding_id) {
      return NextResponse.json({ error: 'No wedding context' }, { status: 403 });
    }

    const families = await prisma.family.findMany({
      where: { wedding_id: ctx.wedding_id },
      include: { members: { select: { attending: true } } },
    });

    const total = families.length;
    const submitted = families.filter((f) => f.members.some((m) => m.attending !== null)).length;
    const pending = total - submitted;
    const attending = families.flatMap((f) => f.members).filter((m) => m.attending === true).length;
    const notAttending = families.flatMap((f) => f.members).filter((m) => m.attending === false).length;
    const completionPct = total > 0 ? Math.round((submitted / total) * 100) : 0;

    return NextResponse.json({ total, submitted, pending, attending, notAttending, completionPct });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[MCP] rsvp-status error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
