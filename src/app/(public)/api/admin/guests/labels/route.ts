/**
 * Wedding Admin - Guest Labels API
 *
 * GET  /api/admin/guests/labels  — List all labels for the wedding
 * POST /api/admin/guests/labels  — Create a new label
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { listLabelsHandler, createLabelHandler, handleGuestApiError } from '@/lib/guests/api-handlers';

const missingWeddingId = (): NextResponse => {
  const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } };
  return NextResponse.json(body, { status: 403 });
};

export async function GET(_request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return missingWeddingId();
    return listLabelsHandler(user.wedding_id);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'list labels' });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return missingWeddingId();
    const body = await request.json();
    return createLabelHandler(user.wedding_id, body);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'create label' });
  }
}
