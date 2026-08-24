/**
 * GET /api/spotify/search?q=...&market=ES
 *
 * Public proxy for Spotify track search, used by the guest RSVP song
 * suggestion input. Uses the app-level Client Credentials token — no guest
 * authentication required, this only reads Spotify's public catalog.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isSpotifyConfigured, searchTracks } from '@/lib/spotify/client';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  market: z.string().trim().max(2).optional(),
});

// This proxy shares a single Nupci-wide Spotify app quota across every
// wedding's guests — keep per-IP limits generous for real typing but tight
// enough to blunt a scripted flood exhausting that shared quota.
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_SECONDS = 10;

export async function GET(request: NextRequest) {
  try {
    if (!isSpotifyConfigured()) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_CONFIGURED', message: 'Spotify integration is not configured' } },
        { status: 503 }
      );
    }

    const withinLimit = await checkRateLimit(`spotify-search:${getClientIp(request)}`, RATE_LIMIT, RATE_LIMIT_WINDOW_SECONDS);
    if (!withinLimit) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Too many search requests, please slow down' } },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = searchQuerySchema.safeParse({
      q: searchParams.get('q') ?? '',
      market: searchParams.get('market') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid search query' } },
        { status: 400 }
      );
    }

    const tracks = await searchTracks(parsed.data.q, parsed.data.market ?? 'ES');

    return NextResponse.json({ success: true, data: tracks });
  } catch (error) {
    console.error('[spotify/search] Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to search Spotify' } },
      { status: 500 }
    );
  }
}
