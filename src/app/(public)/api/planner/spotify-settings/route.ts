/**
 * Planner — Spotify sync settings
 *
 * GET   /api/planner/spotify-settings  Current sync toggle + whether the
 *                                       Spotify integration is configured
 *                                       system-wide.
 * PATCH /api/planner/spotify-settings  Enable/disable the nightly playlist
 *                                       sync job for all of the planner's
 *                                       weddings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { isSpotifyConfigured } from '@/lib/spotify/client';

const updateSchema = z.object({
  spotify_sync_enabled: z.boolean(),
});

export async function GET() {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const planner = await prisma.weddingPlanner.findUnique({
      where: { id: user.planner_id },
      select: { spotify_sync_enabled: true },
    });

    if (!planner) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      data: { spotify_sync_enabled: planner.spotify_sync_enabled, spotify_configured: isSpotifyConfigured() },
    });
  } catch (error) {
    console.error('GET /api/planner/spotify-settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
    }

    if (parsed.data.spotify_sync_enabled && !isSpotifyConfigured()) {
      return NextResponse.json({ error: 'Spotify is not configured' }, { status: 400 });
    }

    const updated = await prisma.weddingPlanner.update({
      where: { id: user.planner_id },
      data: { spotify_sync_enabled: parsed.data.spotify_sync_enabled },
      select: { spotify_sync_enabled: true },
    });

    return NextResponse.json({ data: { ...updated, spotify_configured: isSpotifyConfigured() } });
  } catch (error) {
    console.error('PATCH /api/planner/spotify-settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
