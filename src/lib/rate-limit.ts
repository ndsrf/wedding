/**
 * Simple fixed-window rate limiter for public, unauthenticated API routes.
 *
 * Backed by Redis when configured (shared across instances); falls back to
 * an in-memory per-process Map otherwise — best-effort only, but still
 * enough to blunt a single scripted client hammering an endpoint.
 */

import { getClient } from '@/lib/cache/redis';

const memoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true if the caller is still within its quota for `key` (and
 * records this call), false if the limit has been exceeded.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const client = getClient();

  if (client) {
    try {
      const redisKey = `ratelimit:${key}`;
      const count = await client.incr(redisKey);
      if (count === 1) await client.expire(redisKey, windowSeconds);
      return count <= limit;
    } catch {
      // Redis hiccup — fail open rather than blocking legitimate traffic.
      return true;
    }
  }

  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

/** Best-effort client identifier for rate limiting public routes (no auth/session to key on). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
