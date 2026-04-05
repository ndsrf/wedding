/**
 * Vercel Cron — Main cron endpoint
 *
 * Schedule: daily at 08:00 UTC  (vercel.json: "0 8 * * *")
 *
 * Delegates to the cron runner which executes all registered jobs in sequence.
 * To add a new job, register it in src/lib/cron/registry.ts.
 *
 * Protected by CRON_SECRET.
 * Vercel sets automatically: Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { runCronJobs } from '@/lib/cron/runner';
import { getPlatformOptimization } from '@/lib/platform/config';

export const maxDuration = 60;

/** Constant-time string comparison to prevent timing attacks on the cron secret. */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const platform = getPlatformOptimization();

  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && !safeCompare(authHeader ?? '', `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (platform !== 'vercel') {
    console.log('[CRON] Manual trigger on non-Vercel platform');
  }

  try {
    const result = await runCronJobs();
    console.log(`[CRON] Completed in ${result.duration_ms}ms`);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[CRON] Fatal error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
