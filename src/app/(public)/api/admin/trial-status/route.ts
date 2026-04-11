/**
 * GET /api/admin/trial-status
 *
 * Returns whether the admin's wedding belongs to a trial-mode planner.
 * Trial mode = planner license has can_delete_weddings === false
 * (trial accounts are created with can_delete_weddings: false; all real accounts default to true)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      return NextResponse.json({ isTrialMode: false });
    }

    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: {
        planner: {
          select: {
            license: {
              select: { can_delete_weddings: true },
            },
          },
        },
      },
    });

    const license = wedding?.planner?.license;
    const isTrialMode = license != null && license.can_delete_weddings === false;

    return NextResponse.json({ isTrialMode });
  } catch {
    return NextResponse.json({ isTrialMode: false });
  }
}
