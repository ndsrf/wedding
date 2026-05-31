/**
 * MCP — Update Family RSVP
 * POST /api/admin/mcp/update-rsvp
 * Auth: Bearer API key (wedding_admin role)
 * Body: { familyName: string, attending?: boolean, memberUpdates?: { memberName: string, attending: boolean }[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKeyAuth } from '@/lib/auth/api-key';
import { prisma } from '@/lib/db/prisma';

interface MemberUpdate {
  memberName: string;
  attending: boolean;
}

interface UpdateRsvpBody {
  familyName: string;
  attending?: boolean;
  memberUpdates?: MemberUpdate[];
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireApiKeyAuth(request, 'wedding_admin');
    if (!ctx.wedding_id) {
      return NextResponse.json({ error: 'No wedding context' }, { status: 403 });
    }

    const { familyName, attending, memberUpdates } = await request.json() as UpdateRsvpBody;
    if (!familyName) {
      return NextResponse.json({ error: 'familyName is required' }, { status: 400 });
    }

    const families = await prisma.family.findMany({
      where: { wedding_id: ctx.wedding_id, name: { contains: familyName, mode: 'insensitive' } },
      include: { members: { select: { id: true, name: true, attending: true } } },
    });

    if (families.length === 0) {
      return NextResponse.json({ error: `No family found matching "${familyName}"` }, { status: 404 });
    }

    if (families.length > 1) {
      return NextResponse.json({
        status: 'ambiguous',
        message: `Multiple families found matching "${familyName}". Please clarify.`,
        families: families.map((f) => ({ id: f.id, name: f.name, members: f.members.map((m) => m.name) })),
      });
    }

    const family = families[0];
    const results: Array<{ member: string; attending: boolean }> = [];
    const notFound: string[] = [];

    if (memberUpdates && memberUpdates.length > 0) {
      const memberMap = new Map(family.members.map((m) => [m.name.toLowerCase(), m]));
      const updatedIds: string[] = [];

      for (const update of memberUpdates) {
        const member = memberMap.get(update.memberName.toLowerCase());
        if (!member) { notFound.push(update.memberName); continue; }
        await prisma.familyMember.update({ where: { id: member.id }, data: { attending: update.attending } });
        results.push({ member: member.name, attending: update.attending });
        updatedIds.push(member.id);
      }

      if (attending !== undefined) {
        await prisma.familyMember.updateMany({
          where: { family_id: family.id, id: { notIn: updatedIds } },
          data: { attending },
        });
        for (const m of family.members.filter((m) => !updatedIds.includes(m.id))) {
          results.push({ member: m.name, attending });
        }
      }
    } else if (attending !== undefined) {
      await prisma.familyMember.updateMany({ where: { family_id: family.id }, data: { attending } });
      for (const m of family.members) results.push({ member: m.name, attending });
    } else {
      return NextResponse.json({ error: 'Provide attending or memberUpdates (or both)' }, { status: 400 });
    }

    return NextResponse.json({
      status: notFound.length > 0 ? 'partial' : 'success',
      family: family.name,
      updated: results,
      notFound: notFound.length > 0 ? notFound : undefined,
      message: notFound.length > 0
        ? `Updated ${results.length} member(s) for "${family.name}". Could not find: ${notFound.join(', ')}.`
        : `Updated ${results.length} member(s) for family "${family.name}".`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[MCP] update-rsvp error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
