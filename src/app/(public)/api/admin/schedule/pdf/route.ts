/**
 * Admin Schedule PDF Export (thin wrapper)
 *
 * GET /api/admin/schedule/pdf?view=planner|couple
 *
 * Business logic lives in src/lib/schedule/api-handlers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { getSchedulePdfHandler } from '@/lib/schedule/api-handlers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return NextResponse.json({ error: 'No wedding assigned' }, { status: 400 });
    const viewMode = (req.nextUrl.searchParams.get('view') ?? 'couple') as 'planner' | 'couple';
    return await getSchedulePdfHandler(user.wedding_id, viewMode);
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (msg.includes('Unauthorized') || msg.includes('Forbidden')) {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error('[schedule pdf admin GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
