import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { createRoomToken, contractRoomId } from '@/lib/collaboration/liveblocks';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Try authenticated planner first
    let plannerUser: { planner_id?: string | null; email?: string | null; name?: string | null } | null = null;
    try {
      plannerUser = await requireRole('planner');
    } catch {
      // not authenticated as planner — may be a client with a share token
    }

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let userId: string;
    let userName: string;
    let userColor: string;

    if (plannerUser?.planner_id && contract.planner_id === plannerUser.planner_id) {
      // Authenticated planner
      userId = `planner-${plannerUser.planner_id}`;
      userName = plannerUser.name ?? 'Planner';
      userColor = '#e11d48';
    } else {
      // Check if client access via share_token (passed in body)
      const body = await request.json().catch(() => ({}));
      const shareToken = body?.share_token;
      if (!shareToken || shareToken !== contract.share_token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Client user — use a stable ID based on share token
      userId = `client-${contract.share_token.slice(0, 8)}`;
      userName = body?.client_name ?? 'Client';
      userColor = '#7c3aed';
    }

    const roomId = contract.liveblocks_room_id ?? contractRoomId(id);
    const { body: tokenBody, status } = await createRoomToken({
      roomId,
      userId,
      userInfo: { name: userName, color: userColor },
    });

    if (status !== 200) {
      return NextResponse.json({ error: 'Failed to create collaboration token' }, { status: 500 });
    }

    const { token } = JSON.parse(tokenBody);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
