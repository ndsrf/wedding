/**
 * MCP — Assign Family to Table
 * POST /api/admin/mcp/assign-table
 * Auth: Bearer API key (wedding_admin role)
 * Body: { familyName: string, tableNumber: number, memberNames?: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiKeyAuth } from '@/lib/auth/api-key';
import { prisma } from '@/lib/db/prisma';

interface AssignTableBody {
  familyName: string;
  tableNumber: number;
  memberNames?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireApiKeyAuth(request, 'wedding_admin');
    if (!ctx.wedding_id) {
      return NextResponse.json({ error: 'No wedding context' }, { status: 403 });
    }

    const { familyName, tableNumber, memberNames } = await request.json() as AssignTableBody;
    if (!familyName || !tableNumber) {
      return NextResponse.json({ error: 'familyName and tableNumber are required' }, { status: 400 });
    }

    const families = await prisma.family.findMany({
      where: { wedding_id: ctx.wedding_id, name: { contains: familyName, mode: 'insensitive' } },
      include: { members: { select: { id: true, name: true, attending: true } } },
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

    const table = await prisma.table.findUnique({
      where: { wedding_id_number: { wedding_id: ctx.wedding_id, number: tableNumber } },
      include: { assigned_guests: { select: { id: true } } },
    });

    if (!table) return NextResponse.json({ error: `Table ${tableNumber} not found` }, { status: 404 });

    let targets = family.members.filter((m) => m.attending === true);
    if (memberNames && memberNames.length > 0) {
      const lowerNames = memberNames.map((n) => n.toLowerCase());
      targets = targets.filter((m) => lowerNames.includes(m.name.toLowerCase()));
    }

    if (targets.length === 0) {
      return NextResponse.json({ error: 'No attending members found to assign (check RSVP status).' }, { status: 400 });
    }

    const currentOccupancy = table.assigned_guests.length;
    if (currentOccupancy + targets.length > table.capacity) {
      return NextResponse.json({
        error: `Table ${tableNumber} does not have enough space. Capacity: ${table.capacity}, current: ${currentOccupancy}, adding: ${targets.length}.`,
      }, { status: 400 });
    }

    await prisma.familyMember.updateMany({
      where: { id: { in: targets.map((m) => m.id) } },
      data: { table_id: table.id },
    });

    return NextResponse.json({
      status: 'success',
      message: `Assigned ${targets.length} member(s) of "${family.name}" to table ${tableNumber}.`,
      family: family.name,
      table: tableNumber,
      assignedMembers: targets.map((m) => m.name),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('[MCP] assign-table error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
