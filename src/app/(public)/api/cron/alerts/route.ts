/**
 * Vercel Cron — Alert processor
 *
 * Schedule: every minute  (vercel.json: "* * * * *")
 *
 * Picks up PENDING and retryable FAILED deliveries and dispatches them.
 * Protected by CRON_SECRET to prevent unauthorised triggering.
 *
 * Vercel automatically sets the Authorization header when calling cron routes:
 *   Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { processPendingDeliveries } from '@/lib/alerts/processor';
import { getPlatformOptimization } from '@/lib/platform/config';

/** Constant-time string comparison to prevent timing attacks on the cron secret. */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    // timingSafeEqual requires equal-length buffers
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export const maxDuration = 60; // seconds — Vercel Hobby allows up to 60s on cron routes

export async function GET(req: NextRequest) {
  // On non-Vercel platforms the in-process scheduler handles processing;
  // this endpoint can still be called manually but is not the primary driver.
  const platform = getPlatformOptimization();

  // Verify cron secret (Vercel sets this automatically; on other platforms it's optional)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && !safeCompare(authHeader ?? '', `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // On non-Vercel platforms the scheduler already runs in-process; log a note
  if (platform !== 'vercel') {
    console.log('[CRON/alerts] Manual trigger on non-Vercel platform');
  }

  const start = Date.now();

  try {
    const result = await processPendingDeliveries(50);
    const duration = Date.now() - start;

    console.log(
      `[CRON/alerts] processed=${result.processed} succeeded=${result.succeeded} failed=${result.failed} skipped=${result.skipped} duration=${duration}ms`,
    );

    return NextResponse.json({ ok: true, ...result, duration_ms: duration });
  } catch (err) {
    console.error('[CRON/alerts] Fatal error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
