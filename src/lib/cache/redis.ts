/**
 * Redis Cache Client
 *
 * Server-side cache backed by Redis via ioredis.
 * Reads the connection URL from WEDDING_REDIS_REDIS_URL.
 *
 * Graceful fallback: if the env var is not set or Redis is unreachable,
 * all operations silently become no-ops (cache misses), so the app falls
 * back to hitting the database directly on every request.
 *
 * Usage:
 *   const data = await getCached<MyType>('my:key');
 *   await setCached('my:key', data, CACHE_TTL.WEDDING_STATS);
 *   await invalidateCache('my:key');
 */

import type Redis from 'ioredis';

// ============================================================================
// CACHE KEY HELPERS
// ============================================================================

export const CACHE_KEYS = {
  /** Full wedding details + stats for the /admin/configure page */
  adminWedding: (weddingId: string) => `wedding:admin:${weddingId}`,
  /** Full wedding details + stats for /planner/weddings/:id */
  plannerWeddingDetail: (weddingId: string) => `wedding:planner:detail:${weddingId}`,
  /** Upcoming tasks widget for the couple's /admin dashboard */
  adminUpcomingTasks: (weddingId: string) => `wedding:admin:tasks:${weddingId}`,
  /** Upcoming tasks widget for the planner dashboard (across all weddings) */
  plannerUpcomingTasks: (plannerId: string) => `planner:tasks:${plannerId}`,
} as const;

// ============================================================================
// TTL CONSTANTS (seconds)
// ============================================================================

export const CACHE_TTL = {
  /** Wedding configuration + stats — invalidated on any guest/task mutation */
  WEDDING_STATS: 300, // 5 minutes
  /** Wedding config without stats — changes only when admin edits configure page */
  WEDDING_DETAILS: 600, // 10 minutes
  /** Upcoming task widgets — refreshed when tasks are completed or created */
  UPCOMING_TASKS: 120, // 2 minutes
} as const;

// ============================================================================
// REDIS CLIENT (lazy singleton)
// ============================================================================

let _client: Redis | null = null;
let _connectAttempted = false;

function getClient(): Redis | null {
  if (_connectAttempted) return _client;
  _connectAttempted = true;

  const url = process.env.WEDDING_REDIS_REDIS_URL;
  if (!url) return null;

  try {
    // Dynamic require so Next.js does not bundle ioredis for the browser
     
    const IORedis = require('ioredis') as typeof import('ioredis').default;
    const client = new IORedis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableOfflineQueue: false,
    });

    client.on('error', (err: Error) => {
      // Log but do not crash — callers treat Redis as optional
      console.warn('[Redis] Connection error (caching disabled):', err.message);
      _client = null;
    });

    _client = client;
  } catch (err) {
    console.warn('[Redis] Failed to initialise client:', err);
    _client = null;
  }

  return _client;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Return a cached value by key, or null on miss / Redis unavailable.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Store a value in Redis with the given TTL (seconds).
 * Silently no-ops if Redis is unavailable.
 */
export async function setCached<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch {
    // Non-fatal
  }
}

/**
 * Delete a single cache key.
 * Call this after any mutation that would stale the cached data.
 */
export async function invalidateCache(key: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch {
    // Non-fatal
  }
}

/**
 * Delete all keys matching a glob pattern (uses SCAN to avoid blocking).
 * Use sparingly — prefer targeted invalidation with `invalidateCache`.
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // Non-fatal
  }
}
