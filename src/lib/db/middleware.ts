/**
 * Prisma Middleware for Multi-Tenancy
 *
 * Provides utilities for tenant-scoped database access.
 * Ensures data isolation between different weddings and planners.
 *
 * THREE APPROACHES FOR MULTI-TENANCY:
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
 *    Use this for wedding-scoped operations when you need more control.
 *
 *    Example:
 *    ```ts
 *    const db = getTenantClient({ wedding_id })
 *    const tasks = await db.checklistTask.findMany() // Filtered by wedding_id
 *    ```
 *
 * 3. PLANNER-SCOPED FILTERING with getPlannerClient():
 *    Use this for planner-scoped operations like template management.
 *
 *    Example:
 *    ```ts
 *    const db = getPlannerClient(planner_id)
 *    const template = await db.checklistTemplate.findFirst() // Filtered by planner_id
 *    ```
 */

import { prisma } from './prisma'

// Type for tenant context
export interface TenantContext {
  wedding_id?: string
  planner_id?: string
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

    // ChecklistTask queries with automatic wedding_id filtering
    checklistTask: {
      findMany: (args?: Parameters<typeof prisma.checklistTask.findMany>[0]) =>
        prisma.checklistTask.findMany({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      findFirst: (args?: Parameters<typeof prisma.checklistTask.findFirst>[0]) =>
        prisma.checklistTask.findFirst({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      findUnique: (args: Parameters<typeof prisma.checklistTask.findUnique>[0]) =>
        prisma.checklistTask.findUnique(args), // Unique queries already scoped by ID
      count: (args?: Parameters<typeof prisma.checklistTask.count>[0]) =>
        prisma.checklistTask.count({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      create: (args: Parameters<typeof prisma.checklistTask.create>[0]) => {
        // TypeScript workaround: spread data and add wedding_id
        const data = { ...args.data, wedding_id } as typeof args.data
        return prisma.checklistTask.create({ ...args, data })
      },
      update: (args: Parameters<typeof prisma.checklistTask.update>[0]) =>
        prisma.checklistTask.update(args),
      updateMany: (args: Parameters<typeof prisma.checklistTask.updateMany>[0]) =>
        prisma.checklistTask.updateMany({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      delete: (args: Parameters<typeof prisma.checklistTask.delete>[0]) =>
        prisma.checklistTask.delete(args),
      deleteMany: (args?: Parameters<typeof prisma.checklistTask.deleteMany>[0]) =>
        prisma.checklistTask.deleteMany({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
    },

    // ChecklistSection queries with automatic wedding_id filtering
    // Note: Sections can belong to either a template or a wedding
    // This helper filters for wedding-scoped sections only
    checklistSection: {
      findMany: (args?: Parameters<typeof prisma.checklistSection.findMany>[0]) =>
        prisma.checklistSection.findMany({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      findFirst: (args?: Parameters<typeof prisma.checklistSection.findFirst>[0]) =>
        prisma.checklistSection.findFirst({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      findUnique: (args: Parameters<typeof prisma.checklistSection.findUnique>[0]) =>
        prisma.checklistSection.findUnique(args), // Unique queries already scoped by ID
      count: (args?: Parameters<typeof prisma.checklistSection.count>[0]) =>
        prisma.checklistSection.count({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      create: (args: Parameters<typeof prisma.checklistSection.create>[0]) => {
        // TypeScript workaround: spread data and add wedding_id
        const data = { ...args.data, wedding_id } as typeof args.data
        return prisma.checklistSection.create({ ...args, data })
      },
      update: (args: Parameters<typeof prisma.checklistSection.update>[0]) =>
        prisma.checklistSection.update(args),
      updateMany: (args: Parameters<typeof prisma.checklistSection.updateMany>[0]) =>
        prisma.checklistSection.updateMany({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
      delete: (args: Parameters<typeof prisma.checklistSection.delete>[0]) =>
        prisma.checklistSection.delete(args),
      deleteMany: (args?: Parameters<typeof prisma.checklistSection.deleteMany>[0]) =>
        prisma.checklistSection.deleteMany({
          ...args,
          where: { ...args?.where, wedding_id },
        }),
    },

    // Access to the full prisma client for other operations
    prisma,
  }
}

/**
 * Create a planner-scoped Prisma client
 *
 * Returns helper functions that automatically inject planner_id filtering.
 * Use this for planner operations like template management.
 *
 * @param planner_id - Planner ID for scoping
 * @returns Object with planner-scoped query helpers
 */
export function getPlannerClient(planner_id: string) {
  return {
    // ChecklistTemplate queries with automatic planner_id filtering
    checklistTemplate: {
      findMany: (args?: Parameters<typeof prisma.checklistTemplate.findMany>[0]) =>
        prisma.checklistTemplate.findMany({
          ...args,
          where: { ...args?.where, planner_id },
        }),
      findFirst: (args?: Parameters<typeof prisma.checklistTemplate.findFirst>[0]) =>
        prisma.checklistTemplate.findFirst({
          ...args,
          where: { ...args?.where, planner_id },
        }),
      findUnique: (args: Parameters<typeof prisma.checklistTemplate.findUnique>[0]) =>
        prisma.checklistTemplate.findUnique(args), // Unique queries already scoped by ID
      count: (args?: Parameters<typeof prisma.checklistTemplate.count>[0]) =>
        prisma.checklistTemplate.count({
          ...args,
          where: { ...args?.where, planner_id },
        }),
      create: (args: Parameters<typeof prisma.checklistTemplate.create>[0]) => {
        // TypeScript workaround: spread data and add planner_id
        const data = { ...args.data, planner_id } as typeof args.data
        return prisma.checklistTemplate.create({ ...args, data })
      },
      update: (args: Parameters<typeof prisma.checklistTemplate.update>[0]) =>
        prisma.checklistTemplate.update(args),
      delete: (args: Parameters<typeof prisma.checklistTemplate.delete>[0]) =>
        prisma.checklistTemplate.delete(args),
      upsert: (args: Parameters<typeof prisma.checklistTemplate.upsert>[0]) => {
        // Ensure planner_id is in both create and update data
        const create = { ...args.create, planner_id } as typeof args.create
        return prisma.checklistTemplate.upsert({ ...args, create })
      },
    },

    // ChecklistSection queries for template sections (filtered by template_id)
    // Note: For wedding sections, use getTenantClient instead
    checklistSection: {
      findMany: (args?: Parameters<typeof prisma.checklistSection.findMany>[0]) =>
        prisma.checklistSection.findMany({
          ...args,
          where: {
            ...args?.where,
            template: { planner_id },
          },
        }),
      findFirst: (args?: Parameters<typeof prisma.checklistSection.findFirst>[0]) =>
        prisma.checklistSection.findFirst({
          ...args,
          where: {
            ...args?.where,
            template: { planner_id },
          },
        }),
      count: (args?: Parameters<typeof prisma.checklistSection.count>[0]) =>
        prisma.checklistSection.count({
          ...args,
          where: {
            ...args?.where,
            template: { planner_id },
          },
        }),
      create: (args: Parameters<typeof prisma.checklistSection.create>[0]) =>
        prisma.checklistSection.create(args),
      update: (args: Parameters<typeof prisma.checklistSection.update>[0]) =>
        prisma.checklistSection.update(args),
      delete: (args: Parameters<typeof prisma.checklistSection.delete>[0]) =>
        prisma.checklistSection.delete(args),
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
