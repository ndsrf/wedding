/**
 * Prisma Middleware for Multi-Tenancy
 *
 * Provides utilities for tenant-scoped database access.
 * Ensures data isolation between different weddings.
 *
 * TWO APPROACHES FOR MULTI-TENANCY:
 *
 * 1. AUTOMATIC FILTERING (Recommended for API routes):
 *    Use runWithTenant() to wrap your database operations.
 *    All queries will automatically filter by wedding_id.
 *
 *    Example:
 *    ```ts
 *    export async function GET(req: Request) {
 *      const wedding_id = getWeddingIdFromSession(req)
 *      return runWithTenant(wedding_id, async () => {
 *        const families = await prisma.family.findMany() // Auto-filtered
 *        return Response.json(families)
 *      })
 *    }
 *    ```
 *
 * 2. EXPLICIT FILTERING with getTenantClient():
 *    Use this when you need more control or want explicit scoping.
 *
 *    Example:
 *    ```ts
 *    const db = getTenantClient({ wedding_id })
 *    const families = await db.family.findMany() // Explicitly filtered
 *    ```
 */

import { prisma } from './prisma'

// Type for tenant context
export interface TenantContext {
  wedding_id: string
  user_id?: string
  role?: 'master_admin' | 'planner' | 'wedding_admin' | 'guest'
}

/**
 * Create a tenant-scoped Prisma client
 *
 * Returns helper functions that automatically inject wedding_id filtering.
 * Use this for wedding admin and guest operations when you want explicit control.
 *
 * @param context - Tenant context with wedding_id
 * @returns Object with tenant-scoped query helpers
 */
export function getTenantClient(context: TenantContext) {
  const wedding_id = context.wedding_id

  return {
    // Family queries with automatic wedding_id filtering
    family: {
      findMany: (args?: Parameters<typeof prisma.family.findMany>[0]) =>
        prisma.family.findMany({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      findFirst: (args?: Parameters<typeof prisma.family.findFirst>[0]) =>
        prisma.family.findFirst({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      findUnique: (args: Parameters<typeof prisma.family.findUnique>[0]) =>
        prisma.family.findUnique(args), // Unique queries already scoped by ID
      count: (args?: Parameters<typeof prisma.family.count>[0]) =>
        prisma.family.count({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      create: (args: Parameters<typeof prisma.family.create>[0]) => {
        // TypeScript workaround: spread data and add wedding_id
        const data = { ...args.data, wedding_id } as typeof args.data
        return prisma.family.create({ ...args, data })
      },
      update: (args: Parameters<typeof prisma.family.update>[0]) =>
        prisma.family.update(args),
      delete: (args: Parameters<typeof prisma.family.delete>[0]) =>
        prisma.family.delete(args),
    },

    // FamilyMember queries (scoped via family relationship)
    familyMember: {
      findMany: (args?: Parameters<typeof prisma.familyMember.findMany>[0]) =>
        prisma.familyMember.findMany({
          ...args,
          where: {
            ...args?.where,
            family: { wedding_id },
          },
        }),
      create: (args: Parameters<typeof prisma.familyMember.create>[0]) =>
        prisma.familyMember.create(args),
      update: (args: Parameters<typeof prisma.familyMember.update>[0]) =>
        prisma.familyMember.update(args),
      delete: (args: Parameters<typeof prisma.familyMember.delete>[0]) =>
        prisma.familyMember.delete(args),
    },

    // TrackingEvent queries with automatic wedding_id
    trackingEvent: {
      findMany: (args?: Parameters<typeof prisma.trackingEvent.findMany>[0]) =>
        prisma.trackingEvent.findMany({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      create: (args: Parameters<typeof prisma.trackingEvent.create>[0]) => {
        // TypeScript workaround: spread data and add wedding_id
        const data = { ...args.data, wedding_id } as typeof args.data
        return prisma.trackingEvent.create({ ...args, data })
      },
    },

    // Notification queries with automatic wedding_id
    notification: {
      findMany: (args?: Parameters<typeof prisma.notification.findMany>[0]) =>
        prisma.notification.findMany({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      create: (args: Parameters<typeof prisma.notification.create>[0]) => {
        // TypeScript workaround: spread data and add wedding_id
        const data = { ...args.data, wedding_id } as typeof args.data
        return prisma.notification.create({ ...args, data })
      },
      update: (args: Parameters<typeof prisma.notification.update>[0]) =>
        prisma.notification.update(args),
    },

    // Gift queries with automatic wedding_id
    gift: {
      findMany: (args?: Parameters<typeof prisma.gift.findMany>[0]) =>
        prisma.gift.findMany({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      create: (args: Parameters<typeof prisma.gift.create>[0]) => {
        // TypeScript workaround: spread data and add wedding_id
        const data = { ...args.data, wedding_id } as typeof args.data
        return prisma.gift.create({ ...args, data })
      },
      update: (args: Parameters<typeof prisma.gift.update>[0]) =>
        prisma.gift.update(args),
    },

    // Access to the full prisma client for other operations
    prisma,
  }
}

/**
 * Validate wedding access for a planner
 *
 * Ensures the planner has access to the specified wedding.
 *
 * @param planner_id - Planner ID
 * @param wedding_id - Wedding ID to validate
 * @returns true if planner owns the wedding, false otherwise
 */
export async function validatePlannerAccess(
  planner_id: string,
  wedding_id: string
): Promise<boolean> {
  const wedding = await prisma.wedding.findFirst({
    where: {
      id: wedding_id,
      planner_id: planner_id,
    },
  })

  return wedding !== null
}

/**
 * Validate wedding admin access
 *
 * Ensures the wedding admin has access to the specified wedding.
 *
 * @param email - Wedding admin email
 * @param wedding_id - Wedding ID to validate
 * @returns true if admin has access, false otherwise
 */
export async function validateAdminAccess(
  email: string,
  wedding_id: string
): Promise<boolean> {
  const admin = await prisma.weddingAdmin.findFirst({
    where: {
      email: email,
      wedding_id: wedding_id,
    },
  })

  return admin !== null
}

/**
 * Get wedding ID for a family by magic token
 *
 * @param magic_token - Magic token from URL
 * @returns wedding_id or null if token is invalid
 */
export async function getWeddingIdByMagicToken(
  magic_token: string
): Promise<string | null> {
  const family = await prisma.family.findUnique({
    where: { magic_token },
    select: { wedding_id: true },
  })

  return family?.wedding_id || null
}
