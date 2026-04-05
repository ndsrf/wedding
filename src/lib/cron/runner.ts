/**
 * Cron runner
 *
 * Executes all registered jobs in sequence and collects their metrics.
 * Each job failure is isolated — a failing job doesn't skip subsequent ones.
 */

import { CRON_JOBS } from './registry';
import type { CronRunResult } from './types';

export async function runCronJobs(): Promise<CronRunResult> {
  const start = Date.now();
  const jobs: CronRunResult['jobs'] = {};

  for (const job of CRON_JOBS) {
    const jobStart = Date.now();
    try {
      const metrics = await job.run();
      jobs[job.name] = { ...metrics, duration_ms: Date.now() - jobStart };
      console.log(`[CRON] ${job.name} OK — ${JSON.stringify(metrics)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      jobs[job.name] = { error: message, duration_ms: Date.now() - jobStart };
      console.error(`[CRON] ${job.name} FAILED — ${message}`);
    }
  }

  return {
    ok: true,
    duration_ms: Date.now() - start,
    jobs,
  };
}
