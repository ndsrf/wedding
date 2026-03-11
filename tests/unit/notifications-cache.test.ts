/**
 * Unit tests for Notification Cache Service
 */

import { 
  getCachedUnreadCount, 
  setCachedUnreadCount, 
  incrementUnreadCount, 
  invalidateUnreadCount,
  getCachedNotifications,
  setCachedNotifications,
  invalidateNotificationList
} from '@/lib/notifications/cache';
import { getClient } from '@/lib/cache/redis';

// Mock Redis client
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
};

jest.mock('@/lib/cache/redis', () => ({
  getClient: jest.fn(),
  NOTIFICATION_CACHE_KEYS: {
    unreadCount: (weddingId: string) => `notifications:unread_count:${weddingId}`,
    lastNotifications: (weddingId: string) => `notifications:last_list:${weddingId}`,
  }
}));

describe('Notification Cache Service', () => {
  const weddingId = 'wedding-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (getClient as jest.Mock).mockReturnValue(mockRedis);
  });

  describe('Unread Count', () => {
    it('should get cached unread count', async () => {
      mockRedis.get.mockResolvedValue('5');
      const result = await getCachedUnreadCount(weddingId);
      expect(result).toBe(5);
      expect(mockRedis.get).toHaveBeenCalledWith(expect.stringContaining(weddingId));
    });

    it('should return null when count is not cached', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await getCachedUnreadCount(weddingId);
      expect(result).toBeNull();
    });

    it('should set cached unread count', async () => {
      await setCachedUnreadCount(weddingId, 10);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining(weddingId),
        '10',
        'EX',
        expect.any(Number)
      );
    });

    it('should increment unread count only if it exists', async () => {
      mockRedis.exists.mockResolvedValue(1);
      await incrementUnreadCount(weddingId);
      expect(mockRedis.incr).toHaveBeenCalledWith(expect.stringContaining(weddingId));
    });

    it('should not increment if key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);
      await incrementUnreadCount(weddingId);
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });

    it('should invalidate unread count', async () => {
      await invalidateUnreadCount(weddingId);
      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringContaining(weddingId));
    });
  });

  describe('Notification List', () => {
    const mockNotifications = [
      { id: '1', event_type: 'RSVP_SUBMITTED' },
      { id: '2', event_type: 'LINK_OPENED' },
    ] as any[];

    it('should get cached notifications', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockNotifications));
      const result = await getCachedNotifications(weddingId);
      expect(result).toEqual(mockNotifications);
    });

    it('should return null if no notifications cached', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await getCachedNotifications(weddingId);
      expect(result).toBeNull();
    });

    it('should set cached notifications', async () => {
      await setCachedNotifications(weddingId, mockNotifications);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining(weddingId),
        JSON.stringify(mockNotifications),
        'EX',
        expect.any(Number)
      );
    });

    it('should truncate list to cache size', async () => {
      process.env.NOTIFICATIONS_CACHE_SIZE = '1';
      await setCachedNotifications(weddingId, mockNotifications);
      const expectedData = JSON.stringify([mockNotifications[0]]);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expectedData,
        'EX',
        expect.any(Number)
      );
    });

    it('should invalidate notification list', async () => {
      await invalidateNotificationList(weddingId);
      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringContaining(weddingId));
    });
  });
});
