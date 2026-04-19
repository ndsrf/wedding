/**
 * MCP — Suggest Tables for a Family
 * GET /api/admin/mcp/suggest-tables?familyName=Smith&topN=3
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

    const { searchParams } = new URL(request.url);
    const familyName = searchParams.get('familyName');
    const topN = parseInt(searchParams.get('topN') || '3', 10);

    if (!familyName) return NextResponse.json({ error: 'familyName query param is required' }, { status: 400 });

    const families = await prisma.family.findMany({
      where: { wedding_id: ctx.wedding_id, name: { contains: familyName, mode: 'insensitive' } },
      include: { members: { where: { attending: true }, select: { id: true, name: true, age: true } } },
    });

    if (families.length === 0) return NextResponse.json({ error: `No family found matching "${familyName}"` }, { status: 404 });
    if (families.length > 1) {
      return NextResponse.json({
        status: 'ambiguous',
        message: `Multiple families found matching "${familyName}". Please clarify.`,
        families: families.map((f) => ({ id: f.id, name: f.name })),
      });
    }

    const family = families[0];
    const attendingCount = family.members.length;
    if (attendingCount === 0) {
      return NextResponse.json({ error: `No attending members in family "${family.name}" to seat.` }, { status: 400 });
    }

    const invitedByAdminId = family.invited_by_admin_id ?? null;
    const familyAges = family.members.map((m) => m.age).filter((a): a is number => a !== null && a !== undefined);
    const familyAvgAge = familyAges.length > 0 ? familyAges.reduce((s, a) => s + a, 0) / familyAges.length : null;

    const tables = await prisma.table.findMany({
      where: { wedding_id: ctx.wedding_id },
      include: {
        assigned_guests: {
          select: { age: true, family: { select: { invited_by_admin_id: true } } },
        },
      },
      orderBy: { number: 'asc' },
    });

    type Suggestion = {
      tableNumber: number;
      capacity: number;
      currentOccupancy: number;
      availableSeats: number;
      sharedAdminCount: number;
      ageDiff: number | null;
    };

    const suggestions: Suggestion[] = [];

    for (const t of tables) {
      const currentOccupancy = t.assigned_guests.length;
      const availableSeats = t.capacity - currentOccupancy;
      if (availableSeats < attendingCount) continue;

      const sharedAdminCount = invitedByAdminId
        ? t.assigned_guests.filter((g) => g.family?.invited_by_admin_id === invitedByAdminId).length
        : 0;

      let ageDiff: number | null = null;
      if (familyAvgAge !== null) {
        const tableAges = t.assigned_guests.map((g) => g.age).filter((a): a is number => a !== null && a !== undefined);
        if (tableAges.length > 0) {
          const tableAvgAge = tableAges.reduce((s, a) => s + a, 0) / tableAges.length;
          ageDiff = Math.abs(familyAvgAge - tableAvgAge);
        }
      }

      suggestions.push({ tableNumber: t.number, capacity: t.capacity, currentOccupancy, availableSeats, sharedAdminCount, ageDiff });
    }

    if (suggestions.length === 0) {
      return NextResponse.json({
        status: 'no_space',
        message: `No table has enough space for ${attendingCount} attending member(s) from "${family.name}".`,
        attendingCount,
      });
    }

    suggestions.sort((a, b) => {
      if (b.sharedAdminCount !== a.sharedAdminCount) return b.sharedAdminCount - a.sharedAdminCount;
      if (a.ageDiff !== null && b.ageDiff !== null) return a.ageDiff - b.ageDiff;
      if (a.ageDiff !== null) return -1;
      if (b.ageDiff !== null) return 1;
      return b.availableSeats - a.availableSeats;
    });

    return NextResponse.json({
      status: 'success',
      family: family.name,
      attendingCount,
      familyAvgAge,
      suggestions: suggestions.slice(0, topN).map((s) => ({
        tableNumber: s.tableNumber,
        capacity: s.capacity,
        currentOccupancy: s.currentOccupancy,
        availableSeats: s.availableSeats,
        sharedAdminGuestsAtTable: s.sharedAdminCount,
        avgAgeDifference: s.ageDiff !== null ? Math.round(s.ageDiff * 10) / 10 : null,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[MCP] suggest-tables error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
