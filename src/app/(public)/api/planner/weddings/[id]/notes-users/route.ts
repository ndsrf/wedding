import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export interface NotesUser {
  id: string;
  name: string;
  email: string;
  role: 'planner' | 'admin';
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireRole('planner');

    const wedding = await prisma.wedding.findFirst({
      where: { id, planner_id: user.planner_id! },
      select: {
        planner: {
          select: {
            id: true,
            name: true,
            email: true,
            sub_accounts: {
              where: { enabled: true },
              select: { id: true, name: true, email: true },
            },
          },
        },
        wedding_admins: {
          select: { id: true, name: true, email: true },
        },
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
      ...wedding.planner.sub_accounts.map((sa) => ({
        id: `planner-${sa.id}`,
        name: sa.name,
        email: sa.email,
        role: 'planner' as const,
      })),
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
    console.error('notes-users (planner):', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
