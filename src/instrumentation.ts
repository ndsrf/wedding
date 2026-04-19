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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instrumentations: [new PrismaInstrumentation() as any, new UndiciInstrumentation() as any],
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

    // Alert processor — non-Vercel environments
    // On Vercel the cron job at /api/cron/alerts fires every minute.
    // On docker/standard/cloudflare we spin up an in-process scheduler instead.
    try {
      const { getPlatformOptimization } = await import('@/lib/platform/config');
      const platform = getPlatformOptimization();

      if (platform !== 'vercel') {
        const { runCronJobs } = await import('@/lib/cron/runner');

        // Run once on startup to flush any pending deliveries from before restart
        runCronJobs().catch((err) =>
          console.error('[Alerts] Startup run error:', err),
        );

        // Then run every 60 seconds
        const INTERVAL_MS = 60_000;
        let running = false;

        setInterval(async () => {
          if (running) return;
          running = true;
          try {
            await runCronJobs();
          } catch (err) {
            console.error('[Alerts] Scheduler error:', err);
          } finally {
            running = false;
          }
        }, INTERVAL_MS);

        console.log(`[Alerts] ✓ In-process scheduler started (platform=${platform}, interval=60s)`);
      } else {
        console.log('[Alerts] ✓ Vercel cron mode — scheduler not started');
      }
    } catch (error) {
      console.error('[Alerts] Failed to start scheduler:', error);
    }

    // Vector DB seeding
    try {
      const { isVectorEnabled, vectorPrisma } = await import('@/lib/db/vector-prisma');
      if (isVectorEnabled() && vectorPrisma) {
        const { PLATFORM_DOCS_ADMIN_TOTAL, PLATFORM_DOCS_PLANNER_TOTAL } = await import('@/lib/ai/nupcibot');
        const { createHash } = await import('crypto');
        const { ingestTextContent } = await import('@/lib/ai/ingestion');

        // Clean up legacy unified docs if they exist
        await vectorPrisma.documentChunk.deleteMany({
          where: { sourceName: 'system-platform-docs' }
        }).catch(() => {});

        const docs = [
          { role: 'admin', text: PLATFORM_DOCS_ADMIN_TOTAL, source: 'system-platform-docs-admin' },
          { role: 'planner', text: PLATFORM_DOCS_PLANNER_TOTAL, source: 'system-platform-docs-planner' },
        ];

        for (const doc of docs) {
          const contentHash = createHash('md5').update(doc.text).digest('hex');

          // Always try to fetch to check existence and metadata
          const rows = await vectorPrisma.$queryRawUnsafe<{ metadata: any }>(
            `SELECT metadata FROM document_chunks WHERE "sourceName" = $1 LIMIT 1`,
            doc.source,
          );

          const existingHash = rows?.[0]?.metadata?.contentHash;
          const existingRole = rows?.[0]?.metadata?.role;

          if (existingHash === contentHash && existingRole === doc.role) {
            console.log(`[VectorDB] ${doc.source} already up to date`);
          } else {
            console.log(`[VectorDB] Seeding/Updating ${doc.source}...`);
            // Explicitly delete existing for this source to ensure clean role-metadata replacement
            await vectorPrisma.documentChunk.deleteMany({ where: { sourceName: doc.source } });
            
            await ingestTextContent({
              text: doc.text,
              sourceName: doc.source,
              docType: 'SYSTEM_MANUAL',
              fullUrl: `${process.env.APP_URL || 'https://nupci.com'}/docs`,
              metadata: { contentHash, role: doc.role },
            });
            console.log(`[VectorDB] ✓ ${doc.source} seeded`);
          }
        }
      }
    } catch (error) {
      console.error('[VectorDB] Failed to seed platform docs:', error);
    }
  }
}
