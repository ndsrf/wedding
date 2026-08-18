/**
 * Wedding Planner - Manual Spotify Sync Trigger
 *
 * POST /api/planner/weddings/:id/spotify-sync/trigger
 *
 * Runs the Spotify playlist sync immediately for a single wedding, for
 * testing from the alert-settings page. Requires the sync to be enabled
 * (spotify-settings toggle) and Spotify to be configured system-wide —
 * otherwise nothing would run and the caller is told why. Sends no
 * notifications; returns the same metrics the nightly cron job logs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { triggerManualSpotifySync } from '@/lib/spotify/sync';

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

    const result = await triggerManualSpotifySync(weddingId);
    if (!result.success) {
      return NextResponse.json({ success: false, reason: result.reason }, { status: 422 });
    }

    return NextResponse.json({ success: true, metrics: result.metrics });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[spotify-sync trigger POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
