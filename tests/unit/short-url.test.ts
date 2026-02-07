/**
 * Unit tests for Short URL Service
 * Tests short code generation and path building
 */

import { getShortUrlPath } from '@/lib/short-url';
import { prisma } from '@/lib/db/prisma';

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    family: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    wedding: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    shortUrl: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Short URL Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock wedding lookup for ensureWeddingInitials
    (prisma.wedding.findUnique as jest.Mock).mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      short_url_initials: 'LJ',
      couple_names: 'Laura y Javier',
    });

    (prisma.wedding.findFirst as jest.Mock).mockResolvedValue(null);
  });

  describe('getShortUrlPath', () => {
    it('should return short path when family has short code', async () => {
      // First call to get wedding_id
      (prisma.family.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: '550e8400-e29b-41d4-a716-446655440010',
          wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        })
        // Second call for ensureShortCode to get existing code
        .mockResolvedValueOnce({
          short_url_code: 'Ab',
        });

      const result = await getShortUrlPath('550e8400-e29b-41d4-a716-446655440010');

      expect(result).toBe('/inv/LJ/Ab');
    });

    it('should generate new code when family has no short code', async () => {
      // First call to get wedding_id
      (prisma.family.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: '550e8400-e29b-41d4-a716-446655440010',
          wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        })
        // Second call for ensureShortCode - no code yet
        .mockResolvedValueOnce({
          short_url_code: null,
        });

      // Mock family.findFirst to check if code is taken
      (prisma.family.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock family.update
      (prisma.family.update as jest.Mock).mockResolvedValue({
        short_url_code: 'Xyz',
      });

      const result = await getShortUrlPath('550e8400-e29b-41d4-a716-446655440010');

      // Should have format /inv/{initials}/{code}
      expect(result).toMatch(/^\/inv\/LJ\/[a-zA-Z0-9]{3,4}$/);
      expect(prisma.family.update).toHaveBeenCalled();
    });

    it('should throw error when family not found', async () => {
      (prisma.family.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getShortUrlPath('550e8400-e29b-41d4-a716-446655440099')).rejects.toThrow(
        'Family not found'
      );
    });

    it('should use wedding initials in path', async () => {
      (prisma.family.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: '550e8400-e29b-41d4-a716-446655440010',
          wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        })
        .mockResolvedValueOnce({
          short_url_code: 'Zzz',
        });

      const result = await getShortUrlPath('550e8400-e29b-41d4-a716-446655440010');

      expect(result).toContain('/inv/LJ/');
      expect(result).toBe('/inv/LJ/Zzz');
    });

    it('should handle different wedding initials', async () => {
      // Mock different wedding
      (prisma.wedding.findUnique as jest.Mock).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440001',
        short_url_initials: 'AP',
        couple_names: 'Ana & Pedro',
      });

      (prisma.family.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: '550e8400-e29b-41d4-a716-446655440010',
          wedding_id: '550e8400-e29b-41d4-a716-446655440001',
        })
        .mockResolvedValueOnce({
          short_url_code: 'Xyz',
        });

      const result = await getShortUrlPath('550e8400-e29b-41d4-a716-446655440010');

      expect(result).toBe('/inv/AP/Xyz');
    });
  });

  describe('Path Format', () => {
    it('should return paths starting with /inv/', async () => {
      (prisma.family.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        })
        .mockResolvedValueOnce({
          short_url_code: 'Abc',
        });

      const result = await getShortUrlPath('550e8400-e29b-41d4-a716-446655440010');

      expect(result).toMatch(/^\/inv\//);
    });

    it('should not have trailing slashes', async () => {
      (prisma.family.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        })
        .mockResolvedValueOnce({
          short_url_code: 'Abc',
        });

      const result = await getShortUrlPath('550e8400-e29b-41d4-a716-446655440010');

      expect(result).not.toMatch(/\/$/);
    });

    it('should use /inv/{initials}/{code} format', async () => {
      (prisma.family.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        })
        .mockResolvedValueOnce({
          short_url_code: 'Abc',
        });

      const result = await getShortUrlPath('550e8400-e29b-41d4-a716-446655440010');

      expect(result).toMatch(/^\/inv\/[A-Z]{2,4}\/[a-zA-Z0-9]{3,4}$/);
    });
  });

  describe('Performance and Caching', () => {
    it('should query family database for wedding_id and code', async () => {
      (prisma.family.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        })
        .mockResolvedValueOnce({
          short_url_code: 'Ab',
        });

      await getShortUrlPath('550e8400-e29b-41d4-a716-446655440010');

      expect(prisma.family.findUnique).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440010' },
        select: { wedding_id: true },
      });

      expect(prisma.family.findUnique).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440010' },
        select: { short_url_code: true },
      });
    });

    it('should query wedding for initials', async () => {
      (prisma.family.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        })
        .mockResolvedValueOnce({
          short_url_code: 'Ab',
        });

      await getShortUrlPath('550e8400-e29b-41d4-a716-446655440010');

      expect(prisma.wedding.findUnique).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440000' },
        select: { short_url_initials: true, couple_names: true },
      });
    });
  });
});
