/**
 * Unit tests for Platform Configuration
 * Tests platform detection and optimization settings
 */

import {
  getPlatformOptimization,
  supportsEdgeRuntime,
  supportsISR,
  getRecommendedCacheTTL,
} from '@/lib/platform/config';

describe('Platform Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    // Suppress console warnings/logs in tests
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('getPlatformOptimization', () => {
    it('should return "vercel" when PLATFORM_OPTIMIZATION=vercel', () => {
      process.env.PLATFORM_OPTIMIZATION = 'vercel';
      expect(getPlatformOptimization()).toBe('vercel');
    });

    it('should return "cloudflare" when PLATFORM_OPTIMIZATION=cloudflare', () => {
      process.env.PLATFORM_OPTIMIZATION = 'cloudflare';
      expect(getPlatformOptimization()).toBe('cloudflare');
    });

    it('should return "docker" when PLATFORM_OPTIMIZATION=docker', () => {
      process.env.PLATFORM_OPTIMIZATION = 'docker';
      expect(getPlatformOptimization()).toBe('docker');
    });

    it('should return "standard" when PLATFORM_OPTIMIZATION=standard', () => {
      process.env.PLATFORM_OPTIMIZATION = 'standard';
      expect(getPlatformOptimization()).toBe('standard');
    });

    it('should default to "standard" when PLATFORM_OPTIMIZATION is not set', () => {
      delete process.env.PLATFORM_OPTIMIZATION;
      expect(getPlatformOptimization()).toBe('standard');
    });

    it('should be case-insensitive', () => {
      process.env.PLATFORM_OPTIMIZATION = 'VERCEL';
      expect(getPlatformOptimization()).toBe('vercel');

      process.env.PLATFORM_OPTIMIZATION = 'CloudFlare';
      expect(getPlatformOptimization()).toBe('cloudflare');
    });

    it('should default to "standard" and warn on invalid value', () => {
      process.env.PLATFORM_OPTIMIZATION = 'invalid-platform';
      expect(getPlatformOptimization()).toBe('standard');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid PLATFORM_OPTIMIZATION value')
      );
    });
  });

  describe('supportsEdgeRuntime', () => {
    it('should return true for Vercel with Prisma Accelerate', () => {
      process.env.PLATFORM_OPTIMIZATION = 'vercel';
      process.env.DATABASE_URL = 'prisma://accelerate.prisma-data.net/?api_key=xxx';
      expect(supportsEdgeRuntime()).toBe(true);
    });

    it('should return true for Cloudflare with Prisma Accelerate', () => {
      process.env.PLATFORM_OPTIMIZATION = 'cloudflare';
      process.env.DATABASE_URL = 'prisma://accelerate.prisma-data.net/?api_key=xxx';
      expect(supportsEdgeRuntime()).toBe(true);
    });

    it('should return false for Vercel without Prisma Accelerate', () => {
      process.env.PLATFORM_OPTIMIZATION = 'vercel';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/wedding';
      expect(supportsEdgeRuntime()).toBe(false);
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Edge Runtime disabled')
      );
    });

    it('should return false for Docker platform', () => {
      process.env.PLATFORM_OPTIMIZATION = 'docker';
      process.env.DATABASE_URL = 'prisma://accelerate.prisma-data.net/?api_key=xxx';
      expect(supportsEdgeRuntime()).toBe(false);
    });

    it('should return false for standard platform', () => {
      process.env.PLATFORM_OPTIMIZATION = 'standard';
      process.env.DATABASE_URL = 'prisma://accelerate.prisma-data.net/?api_key=xxx';
      expect(supportsEdgeRuntime()).toBe(false);
    });

    it('should handle missing DATABASE_URL', () => {
      process.env.PLATFORM_OPTIMIZATION = 'vercel';
      delete process.env.DATABASE_URL;
      expect(supportsEdgeRuntime()).toBe(false);
    });

    it('should handle empty DATABASE_URL', () => {
      process.env.PLATFORM_OPTIMIZATION = 'vercel';
      process.env.DATABASE_URL = '';
      expect(supportsEdgeRuntime()).toBe(false);
    });
  });

  describe('supportsISR', () => {
    it('should return true for Vercel', () => {
      process.env.PLATFORM_OPTIMIZATION = 'vercel';
      expect(supportsISR()).toBe(true);
    });

    it('should return true for Cloudflare', () => {
      process.env.PLATFORM_OPTIMIZATION = 'cloudflare';
      expect(supportsISR()).toBe(true);
    });

    it('should return false for Docker', () => {
      process.env.PLATFORM_OPTIMIZATION = 'docker';
      expect(supportsISR()).toBe(false);
    });

    it('should return false for standard', () => {
      process.env.PLATFORM_OPTIMIZATION = 'standard';
      expect(supportsISR()).toBe(false);
    });

    it('should return false when platform is not set', () => {
      delete process.env.PLATFORM_OPTIMIZATION;
      expect(supportsISR()).toBe(false);
    });
  });

  describe('getRecommendedCacheTTL', () => {
    it('should return 3600 for Vercel', () => {
      process.env.PLATFORM_OPTIMIZATION = 'vercel';
      expect(getRecommendedCacheTTL()).toBe(3600);
    });

    it('should return 3600 for Cloudflare', () => {
      process.env.PLATFORM_OPTIMIZATION = 'cloudflare';
      expect(getRecommendedCacheTTL()).toBe(3600);
    });

    it('should return 900 for Docker', () => {
      process.env.PLATFORM_OPTIMIZATION = 'docker';
      expect(getRecommendedCacheTTL()).toBe(900);
    });

    it('should return 900 for standard', () => {
      process.env.PLATFORM_OPTIMIZATION = 'standard';
      expect(getRecommendedCacheTTL()).toBe(900);
    });

    it('should return 900 as default when platform is not set', () => {
      delete process.env.PLATFORM_OPTIMIZATION;
      expect(getRecommendedCacheTTL()).toBe(900);
    });
  });

  describe('Integration scenarios', () => {
    it('should correctly identify Vercel production environment', () => {
      process.env.PLATFORM_OPTIMIZATION = 'vercel';
      process.env.DATABASE_URL = 'prisma://accelerate.prisma-data.net/?api_key=secret';

      expect(getPlatformOptimization()).toBe('vercel');
      expect(supportsISR()).toBe(true);
      expect(supportsEdgeRuntime()).toBe(true);
      expect(getRecommendedCacheTTL()).toBe(3600);
    });

    it('should correctly identify Vercel without Edge support', () => {
      process.env.PLATFORM_OPTIMIZATION = 'vercel';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/wedding';

      expect(getPlatformOptimization()).toBe('vercel');
      expect(supportsISR()).toBe(true);
      expect(supportsEdgeRuntime()).toBe(false);
      expect(getRecommendedCacheTTL()).toBe(3600);
    });

    it('should correctly identify Cloudflare environment', () => {
      process.env.PLATFORM_OPTIMIZATION = 'cloudflare';
      process.env.DATABASE_URL = 'prisma://accelerate.prisma-data.net/?api_key=secret';

      expect(getPlatformOptimization()).toBe('cloudflare');
      expect(supportsISR()).toBe(true);
      expect(supportsEdgeRuntime()).toBe(true);
      expect(getRecommendedCacheTTL()).toBe(3600);
    });

    it('should correctly identify Docker self-hosted environment', () => {
      process.env.PLATFORM_OPTIMIZATION = 'docker';
      process.env.DATABASE_URL = 'postgresql://db:5432/wedding';

      expect(getPlatformOptimization()).toBe('docker');
      expect(supportsISR()).toBe(false);
      expect(supportsEdgeRuntime()).toBe(false);
      expect(getRecommendedCacheTTL()).toBe(900);
    });

    it('should correctly identify standard development environment', () => {
      process.env.PLATFORM_OPTIMIZATION = 'standard';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/wedding_dev';

      expect(getPlatformOptimization()).toBe('standard');
      expect(supportsISR()).toBe(false);
      expect(supportsEdgeRuntime()).toBe(false);
      expect(getRecommendedCacheTTL()).toBe(900);
    });

    it('should handle default unoptimized setup', () => {
      delete process.env.PLATFORM_OPTIMIZATION;
      delete process.env.DATABASE_URL;

      expect(getPlatformOptimization()).toBe('standard');
      expect(supportsISR()).toBe(false);
      expect(supportsEdgeRuntime()).toBe(false);
      expect(getRecommendedCacheTTL()).toBe(900);
    });
  });
});
