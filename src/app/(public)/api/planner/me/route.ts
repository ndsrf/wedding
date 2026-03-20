import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const user = await requireRole('planner');
    return NextResponse.json({ name: user.name ?? 'Planner', email: user.email });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
