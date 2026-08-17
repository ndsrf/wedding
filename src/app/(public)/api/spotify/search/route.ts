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

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  market: z.string().trim().max(2).optional(),
});

export async function GET(request: NextRequest) {
  try {
    if (!isSpotifyConfigured()) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_CONFIGURED', message: 'Spotify integration is not configured' } },
        { status: 503 }
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
