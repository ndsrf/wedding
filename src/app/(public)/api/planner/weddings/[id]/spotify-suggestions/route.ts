/**
 * Wedding Planner - Spotify Song Suggestions (debug listing)
 *
 * GET  /api/planner/weddings/:id/spotify-suggestions       List every suggestion
 * POST /api/planner/weddings/:id/spotify-suggestions       Add a blank manual row
 *
 * Mirrors /api/admin/wedding/spotify-suggestions but scoped to a
 * planner-owned wedding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { listSongSuggestions, createManualSongSuggestion } from '@/lib/spotify/suggestions';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse, GetSpotifySuggestionsResponse, CreateSpotifySuggestionResponse } from '@/types/api';

const createSchema = z.object({
  raw_input: z.string().trim().min(1),
});

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

export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const response: APIResponse = {
        success: false,
        error: { code: API_ERROR_CODES.VALIDATION_ERROR, message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      };
      return NextResponse.json(response, { status: 422 });
    }

    const suggestion = await createManualSongSuggestion(weddingId, parsed.data.raw_input);

    const response: CreateSpotifySuggestionResponse = { success: true, data: { suggestion } };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/planner/weddings/:id/spotify-suggestions]', err);
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
