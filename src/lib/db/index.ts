/**
 * Database Module
 *
 * Exports Prisma client, middleware, and utility functions for database access.
 *
 * Two approaches for multi-tenancy:
 * 1. Automatic filtering with runWithTenant() + getTenantClient() - uses AsyncLocalStorage
 * 2. Explicit filtering with getTenantClient() - returns scoped query helpers
 */

export {
  prisma,
  disconnectPrisma,
  runWithTenant,
  runWithoutTenant,
  getTenantContext,
  tenantContext,
} from './prisma'
export {
  getTenantClient,
  validatePlannerAccess,
  validateAdminAccess,
  getWeddingIdByMagicToken,
  type TenantContext,
} from './middleware'
