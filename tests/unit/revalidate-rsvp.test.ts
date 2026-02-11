/**
 * Unit tests for RSVP Page Revalidation
 * Tests on-demand revalidation of ISR-cached RSVP pages
 */

import { revalidateWeddingRSVPPages, revalidateRSVPPage } from '@/lib/cache/revalidate-rsvp';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';

// Mock dependencies
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    family: {
      findMany: jest.fn(),
    },
  },
}));

describe('RSVP Page Revalidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('revalidateWeddingRSVPPages', () => {
    it('should revalidate all family RSVP pages for a wedding', async () => {
      const mockFamilies = [
        { magic_token: 'token1' },
        { magic_token: 'token2' },
        { magic_token: 'token3' },
      ];

      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilies);

      await revalidateWeddingRSVPPages('wedding123');

      expect(prisma.family.findMany).toHaveBeenCalledWith({
        where: { wedding_id: 'wedding123' },
        select: { magic_token: true },
      });

      expect(revalidatePath).toHaveBeenCalledTimes(3);
      expect(revalidatePath).toHaveBeenCalledWith('/rsvp/token1');
      expect(revalidatePath).toHaveBeenCalledWith('/rsvp/token2');
      expect(revalidatePath).toHaveBeenCalledWith('/rsvp/token3');

      expect(console.log).toHaveBeenCalledWith(
        '[Revalidation] Successfully revalidated 3 RSVP pages for wedding wedding123'
      );
    });

    it('should skip families with null magic_token', async () => {
      const mockFamilies = [
        { magic_token: 'token1' },
        { magic_token: null },
        { magic_token: 'token2' },
        { magic_token: undefined },
      ];

      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilies);

      await revalidateWeddingRSVPPages('wedding123');

      // Should only call revalidatePath for families with valid tokens
      expect(revalidatePath).toHaveBeenCalledTimes(2);
      expect(revalidatePath).toHaveBeenCalledWith('/rsvp/token1');
      expect(revalidatePath).toHaveBeenCalledWith('/rsvp/token2');
    });

    it('should handle empty family list', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue([]);

      await revalidateWeddingRSVPPages('wedding123');

      expect(revalidatePath).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        '[Revalidation] Successfully revalidated 0 RSVP pages for wedding wedding123'
      );
    });

    it('should handle database errors gracefully without throwing', async () => {
      const dbError = new Error('Database connection failed');
      (prisma.family.findMany as jest.Mock).mockRejectedValue(dbError);

      // Should not throw
      await expect(revalidateWeddingRSVPPages('wedding123')).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        '[Revalidation] Failed to revalidate RSVP pages for wedding wedding123:',
        dbError
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should continue even if revalidatePath throws', async () => {
      const mockFamilies = [
        { magic_token: 'token1' },
        { magic_token: 'token2' },
      ];

      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilies);
      (revalidatePath as jest.Mock).mockImplementation((path: string) => {
        if (path === '/rsvp/token1') {
          throw new Error('Revalidation failed');
        }
      });

      // Should not throw - errors are caught internally by Next.js
      await revalidateWeddingRSVPPages('wedding123');

      expect(revalidatePath).toHaveBeenCalledTimes(2);
    });

    it('should handle weddings with many families efficiently', async () => {
      // Test with 100 families
      const mockFamilies = Array.from({ length: 100 }, (_, i) => ({
        magic_token: `token${i}`,
      }));

      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilies);

      await revalidateWeddingRSVPPages('wedding123');

      expect(revalidatePath).toHaveBeenCalledTimes(100);
      expect(console.log).toHaveBeenCalledWith(
        '[Revalidation] Successfully revalidated 100 RSVP pages for wedding wedding123'
      );
    });
  });

  describe('revalidateRSVPPage', () => {
    it('should revalidate a single RSVP page by token', () => {
      revalidateRSVPPage('test-token-123');

      expect(revalidatePath).toHaveBeenCalledWith('/rsvp/test-token-123');
      expect(console.log).toHaveBeenCalledWith(
        '[Revalidation] Successfully revalidated RSVP page for token test-token-123'
      );
    });

    it('should handle revalidation errors gracefully', () => {
      const error = new Error('Revalidation failed');
      (revalidatePath as jest.Mock).mockImplementation(() => {
        throw error;
      });

      // Should not throw
      expect(() => revalidateRSVPPage('test-token')).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        '[Revalidation] Failed to revalidate RSVP page for token test-token:',
        error
      );
    });

    it('should work with various token formats', () => {
      const tokens = [
        'simple-token',
        'b3a6ac03-f8e6-4cd6-89a0-740486e6b780', // UUID
        'token_with_underscores',
        'token-with-numbers-123',
      ];

      tokens.forEach((token) => {
        (revalidatePath as jest.Mock).mockClear();
        revalidateRSVPPage(token);
        expect(revalidatePath).toHaveBeenCalledWith(`/rsvp/${token}`);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle template update workflow', async () => {
      // Simulate template update scenario
      const weddingId = 'wedding-abc';
      const mockFamilies = [
        { magic_token: 'family1-token' },
        { magic_token: 'family2-token' },
      ];

      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilies);

      // Call revalidation (simulating what happens in API route)
      await revalidateWeddingRSVPPages(weddingId);

      // Verify all family pages were marked for revalidation
      expect(revalidatePath).toHaveBeenCalledWith('/rsvp/family1-token');
      expect(revalidatePath).toHaveBeenCalledWith('/rsvp/family2-token');

      // Success message logged
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle concurrent revalidation calls', async () => {
      const mockFamilies = [{ magic_token: 'token1' }];
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilies);

      // Simulate multiple concurrent template updates
      await Promise.all([
        revalidateWeddingRSVPPages('wedding1'),
        revalidateWeddingRSVPPages('wedding1'),
        revalidateWeddingRSVPPages('wedding1'),
      ]);

      // Each call should complete successfully
      expect(prisma.family.findMany).toHaveBeenCalledTimes(3);
      expect(revalidatePath).toHaveBeenCalledTimes(3);
    });
  });
});
