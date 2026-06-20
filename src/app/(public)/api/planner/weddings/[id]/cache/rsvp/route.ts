/**
 * DELETE /api/planner/weddings/:id/cache/rsvp
 *
 * Clears the in-memory RSVP page cache and triggers ISR revalidation
 * for all guest RSVP pages belonging to the given wedding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import { invalidateWeddingPageCache } from '@/lib/cache/rsvp-page';
import { revalidateWeddingRSVPPages } from '@/lib/cache/revalidate-rsvp';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse } from '@/types/api';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

  await invalidateWeddingPageCache(weddingId);
  await revalidateWeddingRSVPPages(weddingId);

  const response: APIResponse = { success: true };
  return NextResponse.json(response, { status: 200 });
}
