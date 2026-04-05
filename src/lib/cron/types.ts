/**
 * Cron plugin system — shared types
 *
 * A CronJob is a self-contained unit of work that the cron runner executes
 * in sequence. Each job declares its own name (for logs) and runs its logic
 * inside `run()`, returning a plain record of metrics that gets merged into
 * the cron response payload.
 *
 * To add a new job: create a file in src/lib/cron/jobs/, implement CronJob,
 * and register it in src/lib/cron/registry.ts.
 */

export interface CronJob {
  /** Stable identifier shown in logs and the HTTP response (e.g. "quote-expiry") */
  name: string;
  /** Execute the job. Return a flat record of metrics (strings/numbers). */
  run(): Promise<Record<string, string | number>>;
}

export interface CronRunResult {
  ok: boolean;
  duration_ms: number;
  jobs: Record<string, Record<string, string | number>>;
}
