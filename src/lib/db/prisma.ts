/**
 * Prisma Client Singleton
 *
 * Provides a single Prisma client instance with connection pooling.
 * Prevents multiple client instances in development (hot reload).
 * Includes support for tenant-scoped operations via AsyncLocalStorage.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool, PoolConfig } from 'pg'
import { AsyncLocalStorage } from 'async_hooks'

// Type for the global prisma variable
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// AsyncLocalStorage for tenant context
// This allows middleware and utilities to access the current request's tenant context
export const tenantContext = new AsyncLocalStorage<{
  wedding_id?: string
  bypass_tenant_filter?: boolean
}>()

// Create connection pool for PostgreSQL
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Optimize pool configuration based on platform
const platform = process.env.PLATFORM_OPTIMIZATION || 'standard'
const isServerless = platform === 'vercel'

const poolConfig: PoolConfig = {
  connectionString,
  // For serverless, we want fewer connections per function and faster timeout
  max: isServerless ? 2 : (platform === 'cloudflare' || platform === 'docker' ? 20 : 10),
  idleTimeoutMillis: isServerless ? 1000 : 30000,
  connectionTimeoutMillis: 2000,
}

const pool = new Pool(poolConfig)
const adapter = new PrismaPg(pool)

// Prisma Client configuration
const prismaClientOptions: Prisma.PrismaClientOptions = {
  adapter,
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
}

// Create Prisma Client singleton
// In production: create one instance
// In development: reuse global instance to avoid creating multiple clients on hot reload
export const prisma =
  global.prisma ||
  new PrismaClient(prismaClientOptions)

// In development, save the client to the global object
// This prevents creating multiple instances during hot reload
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

/**
 * Run a function with tenant context for automatic wedding_id filtering
 *
 * Use this with getTenantClient() to automatically filter queries by wedding_id.
 * The tenant context is stored in AsyncLocalStorage and accessible within the callback.
 *
 * @param wedding_id - Wedding ID to use for filtering
 * @param callback - Async function to execute with tenant context
 * @returns Result of the callback
 *
 * @example
 * ```ts
 * const families = await runWithTenant(wedding_id, async () => {
 *   const db = getTenantClient({ wedding_id })
 *   return await db.family.findMany() // Automatically filtered by wedding_id
 * })
 * ```
 */
export async function runWithTenant<T>(
  wedding_id: string,
  callback: () => Promise<T>
): Promise<T> {
  return tenantContext.run({ wedding_id }, callback)
}

/**
 * Run a function bypassing tenant filtering
 *
 * Use this for operations that need access to all data (e.g., MasterAdmin operations).
 *
 * @param callback - Async function to execute without tenant filtering
 * @returns Result of the callback
 *
 * @example
 * ```ts
 * const allFamilies = await runWithoutTenant(async () => {
 *   return await prisma.family.findMany() // No automatic filtering
 * })
 * ```
 */
export async function runWithoutTenant<T>(callback: () => Promise<T>): Promise<T> {
  return tenantContext.run({ bypass_tenant_filter: true }, callback)
}

/**
 * Get the current tenant context
 *
 * Returns the wedding_id from AsyncLocalStorage if running within runWithTenant().
 *
 * @returns Current tenant context or undefined
 */
export function getTenantContext() {
  return tenantContext.getStore()
}

/**
 * Graceful shutdown handler
 * Disconnects Prisma client on application shutdown
 */
export async function disconnectPrisma() {
  await prisma.$disconnect()
}

// Handle process termination
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await disconnectPrisma()
  })
}

export default prisma
