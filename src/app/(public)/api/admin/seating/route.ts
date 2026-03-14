/**
 * Wedding Admin – Seating Plan API Route
 *
 * GET  /api/admin/seating – fetch seating plan data
 * POST /api/admin/seating – update seating assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import {
  getSeatingPlanHandler,
  updateSeatingAssignmentsHandler,
} from '@/lib/seating/api-handlers';

export async function GET() {
  const user = await requireRole('wedding_admin');

  if (!user.wedding_id) {
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } },
      { status: 403 }
    );
  }

  return getSeatingPlanHandler(user.wedding_id);
}

export async function POST(request: NextRequest) {
  const user = await requireRole('wedding_admin');

  if (!user.wedding_id) {
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Wedding ID not found in session' } },
      { status: 403 }
    );
  }

  return updateSeatingAssignmentsHandler(user.wedding_id, request);
}
