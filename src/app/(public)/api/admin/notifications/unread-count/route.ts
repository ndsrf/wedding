/**
 * Wedding Admin - Notification Unread Count API Route
 *
 * GET /api/admin/notifications/unread-count - Get the number of unread notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { getCachedUnreadCount, setCachedUnreadCount } from '@/lib/notifications/cache';

/**
 * GET /api/admin/notifications/unread-count
 * Get accurate unread count using relational query (with Redis caching)
 */
export async function GET(_request: NextRequest) {
  const start = performance.now();
  try {
    // Check authentication and require wedding_admin role
    const user = await requireRole('wedding_admin');
    const authEnd = performance.now();

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Wedding ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // 1. Try to get from Redis cache
    const cacheStart = performance.now();
    const cachedCount = await getCachedUnreadCount(user.wedding_id);
    const cacheEnd = performance.now();
    
    if (cachedCount !== null) {
      const totalEnd = performance.now();
      console.debug(`[UnreadCount] CACHE HIT for ${user.wedding_id} in ${(totalEnd - start).toFixed(2)}ms (auth: ${(authEnd - start).toFixed(2)}ms, redis: ${(cacheEnd - cacheStart).toFixed(2)}ms)`);
      return NextResponse.json({
        success: true,
        data: {
          unread_count: cachedCount,
        },
      }, { status: 200 });
    }

    // 2. Cache miss - Calculate accurate unread count using a single count query
    const dbStart = performance.now();
    const unreadCount = await prisma.trackingEvent.count({
      where: {
        wedding_id: user.wedding_id,
        notifications: {
          none: {
            read: true,
          },
        },
      },
    });
    const dbEnd = performance.now();

    // 3. Update Redis cache
    await setCachedUnreadCount(user.wedding_id, unreadCount);
    const totalEnd = performance.now();
    
    console.debug(`[UnreadCount] CACHE MISS for ${user.wedding_id} in ${(totalEnd - start).toFixed(2)}ms (auth: ${(authEnd - start).toFixed(2)}ms, db: ${(dbEnd - dbStart).toFixed(2)}ms)`);

    return NextResponse.json({
      success: true,
      data: {
        unread_count: unreadCount,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch unread count',
      },
    }, { status: 500 });
  }
}
