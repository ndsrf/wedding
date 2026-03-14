/**
 * Wedding Admin – Split Family API Route
 *
 * POST /api/admin/seating/split – split a family into seating sub-groups
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import { splitFamilyHandler } from '@/lib/seating/api-handlers';

export async function POST(request: NextRequest) {
  const user = await requireRole('wedding_admin');

  if (!user.wedding_id) {
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } },
      { status: 403 }
    );
  }

  return splitFamilyHandler(user.wedding_id, request);
}
