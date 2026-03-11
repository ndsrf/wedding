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
  /** Last N notifications for a wedding (JSON list) */
  lastNotifications: (weddingId: string) => `notifications:last_list:${weddingId}`,
} as const;

/** TTL for notification cache (1 hour) */
const NOTIFICATION_CACHE_TTL = 3600;

// ============================================================================
// UNREAD COUNT
// ============================================================================

/**
 * Get the cached unread count for a wedding.
 * Returns null if not cached or Redis is unavailable.
 */
export async function getCachedUnreadCount(weddingId: string): Promise<number | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const count = await client.get(NOTIFICATION_CACHE_KEYS.unreadCount(weddingId));
    return count !== null ? parseInt(count, 10) : null;
  } catch (error) {
    console.warn('[NotificationCache] Error getting unread count:', error);
    return null;
  }
}

/**
 * Set the cached unread count for a wedding.
 */
export async function setCachedUnreadCount(weddingId: string, count: number): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    await client.set(
      NOTIFICATION_CACHE_KEYS.unreadCount(weddingId),
      count.toString(),
      'EX',
      NOTIFICATION_CACHE_TTL
    );
  } catch (error) {
    console.warn('[NotificationCache] Error setting unread count:', error);
  }
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
 * Invalidate all notification caches for a wedding.
 */
export async function invalidateAllNotificationCache(weddingId: string): Promise<void> {
  await Promise.all([
    invalidateUnreadCount(weddingId),
    invalidateNotificationList(weddingId),
  ]);
}
