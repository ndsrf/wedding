/**
 * Wedding Admin - Manual Spotify Sync Trigger
 *
 * POST /api/admin/wedding/spotify-sync/trigger
 *
 * Mirrors /api/planner/weddings/:id/spotify-sync/trigger but scoped to the
 * logged-in admin's own wedding — used by the "Actualizar playlist" button
 * in the song suggestions modal to run exactly what the nightly cron job
 * does (resolve pending suggestions, sync READY ones into the playlist)
 * on demand, without waiting for the next cron tick.
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { triggerManualSpotifySync } from '@/lib/spotify/sync';

export async function POST() {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      return NextResponse.json({ error: 'Wedding ID not found in session' }, { status: 403 });
    }

    const result = await triggerManualSpotifySync(user.wedding_id);
    if (!result.success) {
      return NextResponse.json({ success: false, reason: result.reason }, { status: 422 });
    }

    return NextResponse.json({ success: true, metrics: result.metrics });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[admin spotify-sync trigger POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
