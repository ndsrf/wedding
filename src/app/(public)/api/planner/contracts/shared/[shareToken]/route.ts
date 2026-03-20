import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Public route — no auth required (validates share_token)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ shareToken: string }> }) {
  try {
    const { shareToken } = await params;

    const contract = await prisma.contract.findUnique({
      where: { share_token: shareToken },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        signed_at: true,
        signing_url: true,
        liveblocks_room_id: true,
        planner: { select: { name: true } },
      },
    });

    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: contract });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
