/**
 * GET /api/planner/trial-status
 *
 * Returns whether the current planner is in demo/trial mode.
 * Trial mode = can_delete_weddings === false
 * (trial accounts are created with can_delete_weddings: false; all real accounts default to true)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const user = await requireRole('planner');

    if (!user.planner_id) {
      return NextResponse.json({ isTrialMode: false });
    }

    const license = await prisma.plannerLicense.findUnique({
      where: { planner_id: user.planner_id },
      select: { can_delete_weddings: true },
    });

    const isTrialMode = license !== null && license.can_delete_weddings === false;

    return NextResponse.json({ isTrialMode });
  } catch {
    return NextResponse.json({ isTrialMode: false });
  }
}
