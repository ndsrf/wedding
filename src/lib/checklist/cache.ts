/**
 * Checklist cache invalidation helpers
 *
 * Centralises the logic for clearing upcoming-task caches after any checklist
 * mutation. Always clears the couple's admin widget cache. Also clears the
 * planner's dashboard widget cache — resolving the planner from the wedding
 * when the acting user is a wedding_admin (who has no planner_id in session).
 */

import { prisma } from '@/lib/db/prisma';
import { invalidateCache, CACHE_KEYS } from '@/lib/cache/redis';

/**
 * Invalidate all upcoming-task caches for a given wedding.
 *
 * Pass `knownPlannerId` when the planner is already known (e.g. the acting
 * user is a planner). When it is null/undefined the function looks up the
 * wedding's planner_id so that the planner cache is always cleared regardless
 * of who triggered the mutation.
 */
export async function invalidateChecklistCaches(
  weddingId: string,
  knownPlannerId?: string | null
): Promise<void> {
  let plannerId = knownPlannerId ?? null;

  if (!plannerId) {
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { planner_id: true },
    });
    plannerId = wedding?.planner_id ?? null;
  }

  await Promise.all([
    invalidateCache(CACHE_KEYS.adminUpcomingTasks(weddingId)),
    plannerId
      ? invalidateCache(CACHE_KEYS.plannerUpcomingTasks(plannerId))
      : Promise.resolve(),
  ]);
}
