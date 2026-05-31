/**
 * Planner Schedule PDF Export (thin wrapper)
 *
 * GET /api/planner/weddings/[id]/schedule/pdf?view=planner|couple
 *
 * Business logic lives in src/lib/schedule/api-handlers.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { getSchedulePdfHandler } from '@/lib/schedule/api-handlers';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'No planner' }, { status: 403 });
    const { id: weddingId } = await params;
    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;
    const viewMode = (req.nextUrl.searchParams.get('view') ?? 'couple') as 'planner' | 'couple';
    return await getSchedulePdfHandler(weddingId, viewMode);
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (msg.includes('Unauthorized') || msg.includes('Forbidden')) {
      return NextResponse.json({ error: msg }, { status: 401 });
    }
    console.error('[schedule pdf planner GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
