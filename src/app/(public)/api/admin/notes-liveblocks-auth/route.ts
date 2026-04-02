import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { createRoomToken, notesRoomId } from '@/lib/collaboration/liveblocks';

export async function POST() {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json({ error: 'No wedding associated' }, { status: 400 });
    }

    // Verify admin belongs to the wedding
    const admin = await prisma.weddingAdmin.findFirst({
      where: { id: user.id, wedding_id: user.wedding_id },
      select: { id: true, name: true },
    });
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const roomId = notesRoomId(user.wedding_id);
    const userId = `admin-${user.id}`;
    const { body, status } = await createRoomToken({
      roomId,
      userId,
      userInfo: { name: user.name ?? 'Admin', color: '#7c3aed' },
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
    console.error('notes-liveblocks-auth (admin):', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
