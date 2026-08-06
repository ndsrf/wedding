/**
 * Weddings Picker List — Planner (cross-wedding reports)
 * GET /api/planner/reports/weddings
 *
 * Lightweight id + couple_names list used to populate the "scope to one
 * wedding" selector on the cross-wedding NL query box. Distinct from
 * /api/planner/reports/weddings-summary, which returns full stats.
 */

import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const user = await requireRole('planner');

    const weddings = await prisma.wedding.findMany({
      where: { planner_id: user.planner_id! },
      select: { id: true, couple_names: true, wedding_date: true },
      orderBy: { wedding_date: 'desc' },
    });

    return Response.json(
      weddings.map((w) => ({
        id: w.id,
        coupleNames: w.couple_names,
        weddingDate: w.wedding_date.toISOString().split('T')[0],
      }))
    );
  } catch (error) {
    console.error('Error listing planner weddings:', error);
    return Response.json({ error: 'Failed to list weddings' }, { status: 500 });
  }
}
