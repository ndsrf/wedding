import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

export async function POST() {
  let user;
  try {
    user = await requireRole('wedding_admin');
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user.wedding_id) {
    return NextResponse.json({ error: 'No wedding found' }, { status: 400 });
  }

  const wedding = await prisma.wedding.findUnique({
    where: { id: user.wedding_id },
    select: { admin_schedule_token: true },
  });

  let token = wedding?.admin_schedule_token ?? null;

  if (!token) {
    const newToken = randomUUID();
    // updateMany accepts null in where; count=0 means a concurrent request
    // already set the token, so we fall through to re-fetch.
    const { count } = await prisma.wedding.updateMany({
      where: { id: user.wedding_id, admin_schedule_token: null },
      data: { admin_schedule_token: newToken },
    });
    if (count > 0) {
      token = newToken;
    } else {
      const refetched = await prisma.wedding.findUnique({
        where: { id: user.wedding_id },
        select: { admin_schedule_token: true },
      });
      token = refetched?.admin_schedule_token ?? null;
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Failed to generate share token' }, { status: 500 });
  }

  return NextResponse.json({ data: { token } });
}
