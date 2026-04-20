/**
 * Wedding Admin - Single Guest Label API
 *
 * PATCH  /api/admin/guests/labels/:id  — Update a label
 * DELETE /api/admin/guests/labels/:id  — Delete a label
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { updateLabelHandler, deleteLabelHandler, handleGuestApiError } from '@/lib/guests/api-handlers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const missingWeddingId = (): NextResponse => {
  const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } };
  return NextResponse.json(body, { status: 403 });
};

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return missingWeddingId();
    const { id } = await context.params;
    const body = await request.json();
    return updateLabelHandler(id, user.wedding_id, body);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'update label' });
  }
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return missingWeddingId();
    const { id } = await context.params;
    return deleteLabelHandler(id, user.wedding_id);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'delete label' });
  }
}
