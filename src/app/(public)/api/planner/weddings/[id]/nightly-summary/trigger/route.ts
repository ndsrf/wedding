/**
 * Wedding Planner - Manual Nightly Summary Trigger
 *
 * POST /api/planner/weddings/:id/nightly-summary/trigger
 *
 * Fires the "Wedding nightly summary for couples" alert immediately for a
 * single wedding, for testing from the alert-settings page. Requires the
 * alert to be enabled and the wedding to have at least one admin — otherwise
 * nothing would be delivered and the caller is told why.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { triggerManualNightlySummary } from '@/lib/alerts/nightly-summary';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      return NextResponse.json({ error: 'Planner ID not found in session' }, { status: 403 });
    }

    const { id: weddingId } = await params;

    const wedding = await prisma.wedding.findFirst({
      where: { id: weddingId, planner_id: user.planner_id },
      select: { id: true },
    });
    if (!wedding) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
    }

    const result = await triggerManualNightlySummary(weddingId);
    if (!result.sent) {
      return NextResponse.json({ sent: false, reason: result.reason }, { status: 422 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[nightly-summary trigger POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
