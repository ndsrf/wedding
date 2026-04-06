import { prisma } from '@/lib/db/prisma';
import type { AuthenticatedUser } from '@/types/api';

/**
 * Verify that a user has access to a specific wedding.
 *
 * - For wedding_admins: checks WeddingAdmin.id === user.id
 * - For planners: checks Wedding.planner_id === (user.planner_id ?? user.id)
 *   (handles sub-accounts where user.id is the PlannerSubAccount ID)
 *
 * @param user      - Authenticated user from the session.
 * @param weddingId - Wedding to check access for.
 */
export async function verifyWeddingAccess(
  user: Pick<AuthenticatedUser, 'id' | 'planner_id' | 'role'>,
  weddingId: string
): Promise<boolean> {
  if (user.role === 'wedding_admin') {
    const admin = await prisma.weddingAdmin.findFirst({
      where: { id: user.id, wedding_id: weddingId },
    });
    return !!admin;
  }

  if (user.role === 'planner') {
    // For sub-accounts, planner_id holds the parent WeddingPlanner ID.
    const wedding = await prisma.wedding.findFirst({
      where: { id: weddingId, planner_id: user.planner_id ?? user.id },
    });
    return !!wedding;
  }

  return false;
}
