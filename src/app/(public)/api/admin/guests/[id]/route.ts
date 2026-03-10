/**
 * Wedding Admin - Single Guest API Route
 *
 * GET    /api/admin/guests/:id  — Get family details with members
 * PATCH  /api/admin/guests/:id  — Update family and members
 * DELETE /api/admin/guests/:id  — Delete family
 *
 * Thin auth-and-dispatch wrapper. Business logic lives in
 * src/lib/guests/api-handlers.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import {
  getGuestHandler,
  updateGuestHandler,
  deleteGuestHandler,
  handleGuestApiError,
} from '@/lib/guests/api-handlers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const missingWeddingId = (): NextResponse => {
  const body: APIResponse = { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } };
  return NextResponse.json(body, { status: 403 });
};

export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return missingWeddingId();
    const { id: familyId } = await context.params;
    return getGuestHandler(familyId, user.wedding_id);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'fetch family' });
  }
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return missingWeddingId();
    const { id: familyId } = await context.params;
    const body = await request.json();
    return updateGuestHandler(familyId, user.wedding_id, body, user.id);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'update family' });
  }
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  try {
    const user = await requireRole('wedding_admin');
    if (!user.wedding_id) return missingWeddingId();
    const { id: familyId } = await context.params;
    return deleteGuestHandler(familyId, user.wedding_id, user.id);
  } catch (error) {
    return handleGuestApiError(error, { operation: 'delete family' });
  }
}
