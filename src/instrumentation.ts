/**
 * Next.js Instrumentation Hook
 * This file is automatically called by Next.js when the server starts.
 * Using @vercel/otel for stable Next.js 15 tracing.
 */

export async function register() {
  console.log('[Server] Registering instrumentation with @vercel/otel...');
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerOTel } = await import('@vercel/otel');
    const { PrismaInstrumentation } = await import('@prisma/instrumentation');
    const { UndiciInstrumentation } = await import('@opentelemetry/instrumentation-undici');

    registerOTel({
      serviceName: 'wedding-management-app',
      instrumentations: [
        new PrismaInstrumentation() as any,
        new UndiciInstrumentation() as any,
      ],
      // Send traces to HyperDX when API key is configured.
      // @vercel/otel also respects OTEL_EXPORTER_OTLP_ENDPOINT /
      // OTEL_EXPORTER_OTLP_HEADERS env vars as an alternative.
      ...(process.env.HYPERDX_API_KEY && {
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'https://in-otel.hyperdx.io',
        headers: { authorization: process.env.HYPERDX_API_KEY },
      }),
    });
    
    console.log('[Server] ✓ @vercel/otel initialized with Prisma and Undici tracing');

    // Startup migrations
    try {
      const { runStartupMigrations } = await import('@/lib/db/migrationManager');
      console.log('[Server] Initializing application...');
      await runStartupMigrations();
      console.log('[Server] ✓ Application initialization complete');
    } catch (error) {
      console.error('[Server] ✗ Application initialization failed:', error);
    }

    // Vector DB seeding
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

        if (rows[0]?.metadata?.contentHash === contentHash) {
          console.log('[VectorDB] Platform docs already up to date');
        } else {
          const { ingestTextContent } = await import('@/lib/ai/ingestion');
          console.log('[VectorDB] Seeding platform docs...');
          await ingestTextContent({
            text: PLATFORM_DOCS,
            sourceName: 'system-platform-docs',
            docType: 'SYSTEM_MANUAL',
            fullUrl: `${process.env.APP_URL}/docs`,
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
