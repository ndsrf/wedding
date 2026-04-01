import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { NotesUser } from '@/app/(public)/api/planner/weddings/[id]/notes-users/route';

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json({ error: 'No wedding associated' }, { status: 400 });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      include: {
        planner: { select: { id: true, name: true, email: true } },
        wedding_admins: { select: { id: true, name: true, email: true } },
      },
    });

    if (!wedding) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const users: NotesUser[] = [
      {
        id: `planner-${wedding.planner.id}`,
        name: wedding.planner.name,
        email: wedding.planner.email,
        role: 'planner',
      },
      ...wedding.wedding_admins.map((a) => ({
        id: `admin-${a.id}`,
        name: a.name,
        email: a.email,
        role: 'admin' as const,
      })),
    ];

    return NextResponse.json({ success: true, data: users });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('notes-users (admin):', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
