/**
 * Wedding Planner - Retry a single Spotify song suggestion
 *
 * PATCH /api/planner/weddings/:id/spotify-suggestions/:suggestionId
 *
 * Mirrors /api/admin/wedding/spotify-suggestions/:id but scoped to a
 * planner-owned wedding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
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
  { params }: { params: Promise<{ id: string; suggestionId: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const { id: weddingId, suggestionId } = await params;

    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    if (!isSpotifyConfigured()) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: 'Spotify integration is not configured' },
      };
      return NextResponse.json(response, { status: 422 });
    }

    const body = await request.json();
    const parsed = retrySchema.safeParse(body);
    if (!parsed.success) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      };
      return NextResponse.json(response, { status: 422 });
    }

    const suggestion = await retrySongSuggestion(suggestionId, weddingId, parsed.data.artist_name, parsed.data.track_title);
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
    console.error('[PATCH /api/planner/weddings/:id/spotify-suggestions/:suggestionId]', err);
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
