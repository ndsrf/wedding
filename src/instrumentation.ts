/**
 * Next.js Instrumentation Hook
 * This file is automatically called by Next.js when the server starts
 * Perfect for running database migrations before the app handles requests
 */

export async function register() {
  console.log('[Server] Registering instrumentation...');
  
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Server] Runtime: nodejs - Initializing HyperDX');
    
    // Initialize HyperDX
    if (process.env.HYPERDX_API_KEY) {
      console.log('[Server] HYPERDX_API_KEY found. Initializing SDK...');
      try {
        const { init } = await import('@hyperdx/node-opentelemetry');
        const { PrismaInstrumentation } = await import('@prisma/instrumentation');
        const { UndiciInstrumentation } = await import('@opentelemetry/instrumentation-undici');
        const { PgInstrumentation } = await import('@opentelemetry/instrumentation-pg');
        const { IORedisInstrumentation } = await import('@opentelemetry/instrumentation-ioredis');
        init({
          apiKey: process.env.HYPERDX_API_KEY,
          service: 'wedding-management-app',
          advancedNetworkCapture: true,
          betaMode: true,
          // @ts-expect-error - internal HyperDX option
          EXPERIMENTAL_OTEL_LEVEL: 'verbose',
          /* eslint-disable @typescript-eslint/no-explicit-any */
          additionalInstrumentations: [
            new PrismaInstrumentation() as any,
            new UndiciInstrumentation() as any,
            new PgInstrumentation() as any,
            new IORedisInstrumentation() as any,
          ],
          /* eslint-enable @typescript-eslint/no-explicit-any */
        });
        console.log('[Server] ✓ HyperDX initialized with Prisma, Fetch (Undici), PG, Redis, and Advanced Network tracing');
      } catch (err) {
        console.error('[Server] ✗ Failed to initialize HyperDX:', err);
      }
    } else {
      console.warn('[Server] ⚠ HYPERDX_API_KEY not found in environment. Tracing will be disabled.');
    }

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

        const rows = await vectorPrisma.$queryRawUnsafe<{ metadata: Record<string, unknown> | null }>(
          `SELECT metadata FROM document_chunks WHERE "sourceName" = $1 LIMIT 1`,
          'system-platform-docs',
        );

        const storedHash = rows[0]?.metadata?.contentHash;

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
