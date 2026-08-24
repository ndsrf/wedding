/**
 * Wedding Admin - Retry, discard, or delete a single Spotify song suggestion
 *
 * PATCH  /api/admin/wedding/spotify-suggestions/:id
 * DELETE /api/admin/wedding/spotify-suggestions/:id
 *
 * PATCH { action: 'retry' } lets an admin correct the artist/track pair for
 * a FAILED (or any) suggestion from the "Abrir listado" modal and
 * re-searches Spotify's catalog directly with the corrected values — no AI
 * step, since the admin already supplied clean text. A READY result is
 * picked up by the next playlist sync.
 * PATCH { action: 'discard' } marks it DISCARDED — for a suggestion the
 * admin simply doesn't want on the playlist. If it had already been synced,
 * also removes the track from the real Spotify playlist.
 * DELETE removes a row outright (e.g. a manually-added one created by
 * mistake).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { isSpotifyConfigured } from '@/lib/spotify/client';
import { retrySongSuggestion, discardSongSuggestion, deleteSongSuggestion } from '@/lib/spotify/suggestions';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse, RetrySpotifySuggestionResponse, DeleteSpotifySuggestionResponse } from '@/types/api';

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('discard') }),
  z.object({
    action: z.literal('retry'),
    artist_name: z.string().trim().nullable().optional(),
    track_title: z.string().trim().nullable().optional(),
  }),
]);

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

    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      };
      return NextResponse.json(response, { status: 422 });
    }

    let suggestion;
    if (parsed.data.action === 'discard') {
      suggestion = await discardSongSuggestion(id, user.wedding_id);
    } else {
      if (!parsed.data.artist_name && !parsed.data.track_title) {
        const response: APIResponse = {
          success: false,
          error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Enter an artist or a track' },
        };
        return NextResponse.json(response, { status: 422 });
      }
      if (!isSpotifyConfigured()) {
        const response: APIResponse = {
          success: false,
          error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Spotify integration is not configured' },
        };
        return NextResponse.json(response, { status: 422 });
      }
      suggestion = await retrySongSuggestion(id, user.wedding_id, parsed.data.artist_name || null, parsed.data.track_title || null);
    }

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

export async function DELETE(
  _request: NextRequest,
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

    const { id } = await params;
    const deleted = await deleteSongSuggestion(id, user.wedding_id);
    if (!deleted) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.NOT_FOUND, message: 'Suggestion not found' },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: DeleteSpotifySuggestionResponse = { success: true, data: { deleted: true } };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/admin/wedding/spotify-suggestions/:id]', err);
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
