/**
 * DELETE /api/admin/cache/rsvp
 *
 * Clears the in-memory RSVP page cache and triggers ISR revalidation
 * for all guest RSVP pages belonging to the current wedding.
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { invalidateWeddingPageCache } from '@/lib/cache/rsvp-page';
import { revalidateWeddingRSVPPages } from '@/lib/cache/revalidate-rsvp';
import { API_ERROR_CODES } from '@/types/api';
import type { APIResponse } from '@/types/api';

export async function DELETE(): Promise<NextResponse> {
  const user = await requireRole('wedding_admin');

  if (!user.wedding_id) {
    const response: APIResponse = {
      success: false,
      error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' },
    };
    return NextResponse.json(response, { status: 403 });
  }

  await invalidateWeddingPageCache(user.wedding_id);
  await revalidateWeddingRSVPPages(user.wedding_id);

  const response: APIResponse = { success: true };
  return NextResponse.json(response, { status: 200 });
}
