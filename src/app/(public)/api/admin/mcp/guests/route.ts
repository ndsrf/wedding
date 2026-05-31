/**
 * MCP — Guest List
 * GET /api/admin/mcp/guests
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
      include: { members: { select: { name: true, attending: true, type: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(families.map((f) => ({
      name: f.name,
      channel: f.channel_preference,
      memberCount: f.members.length,
      attending: f.members.filter((m) => m.attending === true).length,
      notAttending: f.members.filter((m) => m.attending === false).length,
      pending: f.members.filter((m) => m.attending === null).length,
      rsvpSubmitted: f.members.some((m) => m.attending !== null),
    })));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[MCP] guests error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
