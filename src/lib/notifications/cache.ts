/**
 * Notification Cache Service
 *
 * Handles Redis-based caching for notifications and unread counts.
 * Provides methods to get/set unread counts and the last N notifications.
 */

import { getClient } from '@/lib/cache/redis';
import type { Notification } from '@/types/models';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Default number of notifications to cache in Redis */
const DEFAULT_CACHE_SIZE = 100;

/**
 * Get the configured cache size from environment variables
 */
function getCacheSize(): number {
  const envSize = process.env.NOTIFICATIONS_CACHE_SIZE;
  if (envSize) {
    const parsed = parseInt(envSize, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_CACHE_SIZE;
}

// ============================================================================
// CACHE KEYS
// ============================================================================

export const NOTIFICATION_CACHE_KEYS = {
  /** Unread count for a wedding */
  unreadCount: (weddingId: string) => `notifications:unread_count:${weddingId}`,
  /** Total count of all notifications for a wedding */
  totalCount: (weddingId: string) => `notifications:total_count:${weddingId}`,
  /** Last N notifications for a wedding (JSON list) */
  lastNotifications: (weddingId: string) => `notifications:last_list:${weddingId}`,
} as const;

/** TTL for notification cache (1 hour) */
const NOTIFICATION_CACHE_TTL = 3600;

/** Soft TTL for notification cache (1 minute) - after this, we still serve stale but revalidate in background */
const NOTIFICATION_SOFT_TTL = 60;

// ============================================================================
// COUNTS
// ============================================================================

interface CachedValue<T> {
  value: T;
  expiry: number;
}

/**
 * Get a cached count by key with soft TTL support.
 */
async function getCachedCount(key: string): Promise<number | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const data = await client.get(key);
    if (data === null) return null;

    try {
      const parsed = JSON.parse(data);
      if (typeof parsed === 'object' && parsed !== null && 'value' in parsed) {
        return (parsed as CachedValue<number>).value;
      }
      // If it's a number/string that JSON.parse handled (like "7" -> 7)
      if (typeof parsed === 'number') return parsed;
      if (typeof parsed === 'string') {
        const value = parseInt(parsed, 10);
        return isNaN(value) ? null : value;
      }
      return null;
    } catch {
      // Fallback for non-JSON strings
      const value = parseInt(data, 10);
      return isNaN(value) ? null : value;
    }
  } catch (error) {
    console.warn(`[NotificationCache] Error getting count for ${key}:`, error);
    return null;
  }
}

/**
 * Set a cached count by key with soft TTL.
 */
async function setCachedCount(key: string, count: number): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const data: CachedValue<number> = {
      value: count,
      expiry: Date.now() + (NOTIFICATION_SOFT_TTL * 1000)
    };
    await client.set(key, JSON.stringify(data), 'EX', NOTIFICATION_CACHE_TTL);
  } catch (error) {
    console.warn(`[NotificationCache] Error setting count for ${key}:`, error);
  }
}

/**
 * Get or set cached count with a producer function.
 * Implements a simple stale-while-revalidate pattern to avoid stampedes.
 */
export async function getOrSetCachedCount(
  key: string,
  producer: () => Promise<number>
): Promise<number> {
  const client = getClient();
  if (!client) return producer();

  try {
    const data = await client.get(key);
    if (data !== null) {
      try {
        const parsed = JSON.parse(data) as CachedValue<number>;
        const now = Date.now();
        
        // If still within soft TTL, return immediately
        if (now < parsed.expiry) {
          return parsed.value;
        }

        // Soft TTL expired - try to acquire a lock to revalidate in background
        const lockKey = `${key}:revalidate_lock`;
        const acquiredLock = await client.set(lockKey, '1', 'EX', 30, 'NX');
        
        if (acquiredLock) {
          // Fire and forget revalidation
          producer().then(async (newValue) => {
            await setCachedCount(key, newValue);
            await client.del(lockKey);
          }).catch((err) => {
            console.error(`[NotificationCache] Background revalidation failed for ${key}:`, err);
            client.del(lockKey);
          });
        }

        // Return stale value while revalidating
        return parsed.value;
      } catch {
        // Fallback for old format - just use it and overwrite with new format
        const value = parseInt(data, 10);
        setCachedCount(key, value).catch(() => {});
        return value;
      }
    }
  } catch (error) {
    console.warn(`[NotificationCache] Error in getOrSetCachedCount for ${key}:`, error);
  }

  // Hard miss or error
  const newValue = await producer();
  await setCachedCount(key, newValue);
  return newValue;
}

/**
 * Get the cached unread count for a wedding.
 * Returns null if not cached or Redis is unavailable.
 */
export async function getCachedUnreadCount(weddingId: string): Promise<number | null> {
  const count = await getCachedCount(NOTIFICATION_CACHE_KEYS.unreadCount(weddingId));
  if (count !== null) {
    console.debug(`[NotificationCache] HIT unread count for ${weddingId}: ${count}`);
  } else {
    console.debug(`[NotificationCache] MISS unread count for ${weddingId}`);
  }
  return count;
}

/**
 * Set the cached unread count for a wedding.
 */
export async function setCachedUnreadCount(weddingId: string, count: number): Promise<void> {
  console.debug(`[NotificationCache] SET unread count for ${weddingId}: ${count}`);
  await setCachedCount(NOTIFICATION_CACHE_KEYS.unreadCount(weddingId), count);
}

/**
 * Get the cached total notification count for a wedding.
 */
export async function getCachedTotalCount(weddingId: string): Promise<number | null> {
  return getCachedCount(NOTIFICATION_CACHE_KEYS.totalCount(weddingId));
}

/**
 * Set the cached total notification count for a wedding.
 */
export async function setCachedTotalCount(weddingId: string, count: number): Promise<void> {
  await setCachedCount(NOTIFICATION_CACHE_KEYS.totalCount(weddingId), count);
}

/**
 * Increment the cached unread count for a wedding.
 * Only increments if the key already exists to avoid out-of-sync counts.
 */
export async function incrementUnreadCount(weddingId: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const key = NOTIFICATION_CACHE_KEYS.unreadCount(weddingId);
    const exists = await client.exists(key);
    if (exists) {
      await client.incr(key);
    }
  } catch (error) {
    console.warn('[NotificationCache] Error incrementing unread count:', error);
  }
}

/**
 * Invalidate the unread count cache for a wedding.
 */
export async function invalidateUnreadCount(weddingId: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.del(NOTIFICATION_CACHE_KEYS.unreadCount(weddingId));
  } catch (error) {
    console.warn('[NotificationCache] Error invalidating unread count:', error);
  }
}

// ============================================================================
// NOTIFICATION LIST
// ============================================================================

/**
 * Get the cached list of last notifications for a wedding.
 * Returns null if not cached or Redis is unavailable.
 */
export async function getCachedNotifications(weddingId: string): Promise<Notification[] | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const data = await client.get(NOTIFICATION_CACHE_KEYS.lastNotifications(weddingId));
    if (!data) return null;
    return JSON.parse(data) as Notification[];
  } catch (error) {
    console.warn('[NotificationCache] Error getting cached notifications:', error);
    return null;
  }
}

/**
 * Set the cached list of last notifications for a wedding.
 */
export async function setCachedNotifications(weddingId: string, notifications: Notification[]): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    // Only cache up to configured size
    const cacheSize = getCacheSize();
    const toCache = notifications.slice(0, cacheSize);

    await client.set(
      NOTIFICATION_CACHE_KEYS.lastNotifications(weddingId),
      JSON.stringify(toCache),
      'EX',
      NOTIFICATION_CACHE_TTL
    );
  } catch (error) {
    console.warn('[NotificationCache] Error setting cached notifications:', error);
  }
}

/**
 * Invalidate the notification list cache for a wedding.
 */
export async function invalidateNotificationList(weddingId: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.del(NOTIFICATION_CACHE_KEYS.lastNotifications(weddingId));
  } catch (error) {
    console.warn('[NotificationCache] Error invalidating notification list:', error);
  }
}

/**
 * Increment the cached total count for a wedding.
 */
export async function incrementTotalCount(weddingId: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const key = NOTIFICATION_CACHE_KEYS.totalCount(weddingId);
    const exists = await client.exists(key);
    if (exists) {
      await client.incr(key);
    }
  } catch (error) {
    console.warn('[NotificationCache] Error incrementing total count:', error);
  }
}

/**
 * Invalidate the total count cache for a wedding.
 */
export async function invalidateTotalCount(weddingId: string): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.del(NOTIFICATION_CACHE_KEYS.totalCount(weddingId));
  } catch (error) {
    console.warn('[NotificationCache] Error invalidating total count:', error);
  }
}

/**
 * Invalidate all notification caches for a wedding.
 */
export async function invalidateAllNotificationCache(weddingId: string): Promise<void> {
  await Promise.all([
    invalidateUnreadCount(weddingId),
    invalidateTotalCount(weddingId),
    invalidateNotificationList(weddingId),
  ]);
}
