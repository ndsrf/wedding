/**
 * Wedding Admin – Random Seating Assignment API Route
 *
 * POST /api/admin/seating/random – randomly assign confirmed guests to tables
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import { randomAssignHandler } from '@/lib/seating/api-handlers';

export async function POST() {
  const user = await requireRole('wedding_admin');

  if (!user.wedding_id) {
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } },
      { status: 403 }
    );
  }

  return randomAssignHandler(user.wedding_id);
}
