/**
 * Wedding Planner - Spotify Song Suggestions (read-only debug listing)
 *
 * GET /api/planner/weddings/:id/spotify-suggestions
 *
 * Mirrors /api/admin/wedding/spotify-suggestions but scoped to a
 * planner-owned wedding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { listSongSuggestions } from '@/lib/spotify/suggestions';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse, GetSpotifySuggestionsResponse } from '@/types/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: weddingId } = await params;

    const denied = await validatePlannerAccess(user.planner_id, weddingId);
    if (denied) return denied;

    const suggestions = await listSongSuggestions(weddingId);

    const response: GetSpotifySuggestionsResponse = { success: true, data: { suggestions } };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/planner/weddings/:id/spotify-suggestions]', err);
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
