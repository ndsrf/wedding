/**
 * Wedding Admin - Spotify Song Suggestions (debug listing)
 *
 * GET  /api/admin/wedding/spotify-suggestions       List every suggestion
 * POST /api/admin/wedding/spotify-suggestions       Add a blank manual row
 *
 * Backs the "Abrir listado" link on the Spotify Playlist gallery card: what
 * each guest/family entered, the resolved track (if any), the suggestion's
 * status, and any ai_error — so an admin can see why a song didn't reach
 * the playlist, and add one by hand (e.g. a guest who mentioned several
 * songs in one free-text answer).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { listSongSuggestions, createManualSongSuggestion } from '@/lib/spotify/suggestions';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse, GetSpotifySuggestionsResponse, CreateSpotifySuggestionResponse } from '@/types/api';

const createSchema = z.object({
  raw_input: z.string().trim().min(1),
});

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const suggestions = await listSongSuggestions(user.wedding_id);

    const response: GetSpotifySuggestionsResponse = { success: true, data: { suggestions } };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/admin/wedding/spotify-suggestions]', err);
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      };
      return NextResponse.json(response, { status: 422 });
    }

    const suggestion = await createManualSongSuggestion(user.wedding_id, parsed.data.raw_input);

    const response: CreateSpotifySuggestionResponse = { success: true, data: { suggestion } };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/admin/wedding/spotify-suggestions]', err);
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
