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
  }
}
