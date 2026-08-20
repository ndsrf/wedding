/**
 * Wedding Admin - Retry a single Spotify song suggestion
 *
 * PATCH /api/admin/wedding/spotify-suggestions/:id
 *
 * Lets an admin correct the artist/track pair for a FAILED (or any) suggestion
 * from the "Abrir listado" modal and re-searches Spotify's catalog directly
 * with the corrected values — no AI step, since the admin already supplied
 * clean text. A READY result is picked up by the next playlist sync.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { isSpotifyConfigured } from '@/lib/spotify/client';
import { retrySongSuggestion } from '@/lib/spotify/suggestions';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse, RetrySpotifySuggestionResponse } from '@/types/api';

const retrySchema = z.object({
  artist_name: z.string().trim().min(1),
  track_title: z.string().trim().min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    if (!isSpotifyConfigured()) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Spotify integration is not configured' },
      };
      return NextResponse.json(response, { status: 422 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = retrySchema.safeParse(body);
    if (!parsed.success) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      };
      return NextResponse.json(response, { status: 422 });
    }

    const suggestion = await retrySongSuggestion(id, user.wedding_id, parsed.data.artist_name, parsed.data.track_title);
    if (!suggestion) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Suggestion not found' },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: RetrySpotifySuggestionResponse = { success: true, data: { suggestion } };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/admin/wedding/spotify-suggestions/:id]', err);
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
