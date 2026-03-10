/**
 * Planner Wedding Access Validation
 *
 * Centralised helper used by all planner guest API routes to verify
 * that the requesting planner owns the target wedding.
 *
 * Previously this was copy-pasted into every planner route file.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

/**
 * Validates that a planner owns the given wedding.
 *
 * @returns `null` if access is granted, or a ready-to-return `NextResponse`
 *          error if access is denied (404 or 403).
 *
 * Usage in a route handler:
 * ```ts
 * const denied = await validatePlannerAccess(user.planner_id, weddingId);
 * if (denied) return denied;
 * ```
 */
export async function validatePlannerAccess(
  plannerId: string,
  weddingId: string,
): Promise<NextResponse | null> {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { planner_id: true },
  });

  if (!wedding) {
    const body: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.NOT_FOUND,
        message: 'Wedding not found',
      },
    };
    return NextResponse.json(body, { status: 404 });
  }

  if (wedding.planner_id !== plannerId) {
    const body: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.FORBIDDEN,
        message: 'You do not have access to this wedding',
      },
    };
    return NextResponse.json(body, { status: 403 });
  }

  return null;
}
