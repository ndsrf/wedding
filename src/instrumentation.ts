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
    try {
      const { isVectorEnabled } = await import('@/lib/db/vector-prisma');
      if (isVectorEnabled()) {
        const { PLATFORM_DOCS } = await import('@/lib/ai/nupcibot');
        const { ingestTextContent } = await import('@/lib/ai/ingestion');

        const appUrl = process.env.APP_URL ?? '';
        console.log('[VectorDB] Seeding platform docs...');
        await ingestTextContent({
          text: PLATFORM_DOCS,
          sourceName: 'system-platform-docs',
          docType: 'SYSTEM_MANUAL',
          fullUrl: `${appUrl}/docs`,
        });
        console.log('[VectorDB] ✓ Platform docs seeded');
      }
    } catch (error) {
      console.error('[VectorDB] Failed to seed platform docs:', error);
    }
  }
}
