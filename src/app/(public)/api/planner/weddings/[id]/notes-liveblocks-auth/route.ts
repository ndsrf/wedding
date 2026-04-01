import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { createRoomToken, notesRoomId } from '@/lib/collaboration/liveblocks';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireRole('planner');

    // Verify the planner owns this wedding
    const wedding = await prisma.wedding.findFirst({
      where: { id, planner_id: user.planner_id! },
      select: { id: true },
    });
    if (!wedding) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const roomId = notesRoomId(id);
    const userId = `planner-${user.planner_id}`;
    const { body, status } = await createRoomToken({
      roomId,
      userId,
      userInfo: { name: user.name ?? 'Planner', color: '#e11d48' },
    });

    if (status !== 200) {
      return NextResponse.json({ error: 'Failed to create collaboration token' }, { status: 500 });
    }

    const { token } = JSON.parse(body);
    return NextResponse.json({ token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('UNAUTHORIZED')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('FORBIDDEN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    console.error('notes-liveblocks-auth (planner):', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
