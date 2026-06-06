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

  let token = wedding?.admin_schedule_token;
  if (!token) {
    token = randomUUID();
    await prisma.wedding.update({
      where: { id: user.wedding_id },
      data: { admin_schedule_token: token },
    });
  }

  return NextResponse.json({ data: { token } });
}
