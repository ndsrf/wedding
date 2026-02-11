/**
 * Platform Configuration
 *
 * Determines platform-specific optimizations based on deployment environment.
 * Supports: vercel, cloudflare, docker, standard
 */

export type PlatformOptimization = 'vercel' | 'cloudflare' | 'docker' | 'standard';

/**
 * Get the current platform optimization setting
 */
export function getPlatformOptimization(): PlatformOptimization {
  const platform = process.env.PLATFORM_OPTIMIZATION?.toLowerCase() || 'standard';

  // Validate platform value
  if (!['vercel', 'cloudflare', 'docker', 'standard'].includes(platform)) {
    console.warn(`[Platform] Invalid PLATFORM_OPTIMIZATION value: ${platform}. Defaulting to 'standard'`);
    return 'standard';
  }

  return platform as PlatformOptimization;
}

/**
 * Check if Edge Runtime is supported for the current platform
 *
 * Edge Runtime requires:
 * - Platform: Vercel or Cloudflare
 * - Prisma: Must be using Prisma Accelerate or Data Proxy for database access
 *
 * Note: For Vercel, check if DATABASE_URL uses prisma:// protocol for Accelerate
 */
export function supportsEdgeRuntime(): boolean {
  const platform = getPlatformOptimization();

  // Edge Runtime is only supported on Vercel and Cloudflare
  if (platform !== 'vercel' && platform !== 'cloudflare') {
    return false;
  }

  // Check if using Prisma Accelerate (prisma:// protocol in DATABASE_URL)
  const databaseUrl = process.env.DATABASE_URL || '';
  const usesPrismaAccelerate = databaseUrl.startsWith('prisma://');

  if (!usesPrismaAccelerate) {
    console.info('[Platform] Edge Runtime disabled: Requires Prisma Accelerate (prisma:// protocol in DATABASE_URL)');
    return false;
  }

  return true;
}

/**
 * Check if ISR (Incremental Static Regeneration) is supported
 *
 * ISR is supported on Vercel and Cloudflare Pages
 */
export function supportsISR(): boolean {
  const platform = getPlatformOptimization();
  return platform === 'vercel' || platform === 'cloudflare';
}

/**
 * Get recommended cache TTL for the current platform
 */
export function getRecommendedCacheTTL(): number {
  const platform = getPlatformOptimization();

  switch (platform) {
    case 'vercel':
    case 'cloudflare':
      return 3600; // 1 hour for edge platforms with ISR
    case 'docker':
    case 'standard':
    default:
      return 900; // 15 minutes for self-hosted
  }
}

/**
 * Log platform configuration on startup
 */
export function logPlatformConfig(): void {
  const platform = getPlatformOptimization();
  const edgeSupport = supportsEdgeRuntime();
  const isrSupport = supportsISR();

  console.log('[Platform] Configuration:');
  console.log(`  - Platform: ${platform}`);
  console.log(`  - Edge Runtime: ${edgeSupport ? 'Enabled' : 'Disabled'}`);
  console.log(`  - ISR Support: ${isrSupport ? 'Enabled' : 'Disabled'}`);
  console.log(`  - Recommended Cache TTL: ${getRecommendedCacheTTL()}s`);
}
