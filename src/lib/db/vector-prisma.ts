/**
 * Vector Prisma Client Singleton
 *
 * Provides a single Prisma client instance connected to the Neon vector database.
 * Prevents multiple client instances in development (hot reload).
 * Returns null and isVectorEnabled()=false when VECTOR_DATABASE_URL is not set.
 *
 * Leverages the same PrismaPg + Pool singleton pattern as src/lib/db/prisma.ts.
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

/**
 * Minimal interface for the vector Prisma client.
 * The full generated client (@prisma/vector-client) extends this with model accessors.
 * Using a local interface avoids TS errors when the client hasn't been generated yet.
 */
export interface VectorPrismaClient {
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T[]>
  $disconnect(): Promise<void>
  documentChunk: {
    deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>
  }
}

declare global {
  var vectorPrismaGlobal: VectorPrismaClient | undefined
}

const vectorDatabaseUrl = process.env.VECTOR_DATABASE_URL

/**
 * Returns true when the vector database is configured and available.
 * Always check this before using `vectorPrisma`.
 */
export function isVectorEnabled(): boolean {
  return !!vectorDatabaseUrl
}

function createVectorClient(): VectorPrismaClient | null {
  if (!vectorDatabaseUrl) {
    return null
  }

  // Require at runtime so missing generated client doesn't crash the main bundle
  const { PrismaClient } = require('@prisma/vector-client') as {
    PrismaClient: new (options: Record<string, unknown>) => VectorPrismaClient
  }

  const pool = new Pool({
    connectionString: vectorDatabaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

  const adapter = new PrismaPg(pool as any)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

// Singleton: reuse global instance in dev to prevent multiple clients on hot reload
export const vectorPrisma: VectorPrismaClient | null =
  global.vectorPrismaGlobal ?? createVectorClient()

if (process.env.NODE_ENV !== 'production') {
  global.vectorPrismaGlobal = vectorPrisma ?? undefined
}

export default vectorPrisma
