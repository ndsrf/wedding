/**
 * Wedding Planner – Seating Plan API Route
 *
 * GET  /api/planner/weddings/:id/seating – fetch seating plan data
 * POST /api/planner/weddings/:id/seating – update seating assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { API_ERROR_CODES } from '@/types/api';
import { validatePlannerAccess } from '@/lib/guests/planner-access';
import {
  getSeatingPlanHandler,
  updateSeatingAssignmentsHandler,
} from '@/lib/seating/api-handlers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole('planner');

  if (!user.planner_id) {
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' } },
      { status: 403 }
    );
  }

  const { id: weddingId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;

  return getSeatingPlanHandler(weddingId);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole('planner');

  if (!user.planner_id) {
    return NextResponse.json(
      { success: false, error: { code: API_ERROR_CODES.FORBIDDEN, message: 'Planner ID not found in session' } },
      { status: 403 }
    );
  }

  const { id: weddingId } = await params;
  const denied = await validatePlannerAccess(user.planner_id, weddingId);
  if (denied) return denied;

  return updateSeatingAssignmentsHandler(weddingId, request);
}
