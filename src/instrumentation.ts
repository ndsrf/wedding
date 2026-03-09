/**
 * Next.js Instrumentation Hook
 * This file is automatically called by Next.js when the server starts
 * Perfect for running database migrations before the app handles requests
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runStartupMigrations } = await import('@/lib/db/migrationManager');

    console.log('[Server] Initializing application...');

    try {
      await runStartupMigrations();
      console.log('[Server] ✓ Application initialization complete');
    } catch (error) {
      console.error('[Server] ✗ Application initialization failed:', error);
      // The migration manager will handle process exit if needed
    }

    // Seed vector DB with platform docs independently of migrations
    // (migrations may be disabled or fail on Vercel, but seeding must still run)
    // Guard: compute a hash of the content and skip if the DB already has the
    // same version — prevents redundant embedding API calls on every cold start.
    try {
      const { isVectorEnabled, vectorPrisma } = await import('@/lib/db/vector-prisma');
      if (isVectorEnabled() && vectorPrisma) {
        const { PLATFORM_DOCS } = await import('@/lib/ai/nupcibot');
        const { createHash } = await import('crypto');

        const contentHash = createHash('md5').update(PLATFORM_DOCS).digest('hex');

        const existing = await vectorPrisma.documentChunk.findFirst({
          where: { sourceName: 'system-platform-docs' },
          select: { metadata: true },
        });

        const storedHash = (existing?.metadata as Record<string, unknown> | null)?.contentHash;

        if (storedHash === contentHash) {
          console.log('[VectorDB] Platform docs already up to date, skipping seed');
        } else {
          const { ingestTextContent } = await import('@/lib/ai/ingestion');
          const appUrl = process.env.APP_URL ?? '';
          console.log('[VectorDB] Seeding platform docs...');
          await ingestTextContent({
            text: PLATFORM_DOCS,
            sourceName: 'system-platform-docs',
            docType: 'SYSTEM_MANUAL',
            fullUrl: `${appUrl}/docs`,
            metadata: { contentHash },
          });
          console.log('[VectorDB] ✓ Platform docs seeded');
        }
      }
    } catch (error) {
      console.error('[VectorDB] Failed to seed platform docs:', error);
    }
  }
}
