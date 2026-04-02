import { prisma } from '@/lib/db/prisma';

/**
 * Verify that a user has access to a specific wedding.
 *
 * @param userId  - For planners: the WeddingPlanner ID (i.e. user.planner_id ?? user.id).
 *                  For wedding_admins: the WeddingAdmin ID (i.e. user.id).
 * @param weddingId - Wedding to check access for.
 * @param userRole  - Role of the authenticated user.
 */
export async function verifyWeddingAccess(
  userId: string,
  weddingId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === 'wedding_admin') {
    const admin = await prisma.weddingAdmin.findFirst({
      where: { id: userId, wedding_id: weddingId },
    });
    return !!admin;
  }

  if (userRole === 'planner') {
    // userId is already the WeddingPlanner ID — single query suffices.
    const wedding = await prisma.wedding.findFirst({
      where: { id: weddingId, planner_id: userId },
    });
    return !!wedding;
  }

  return false;
}
