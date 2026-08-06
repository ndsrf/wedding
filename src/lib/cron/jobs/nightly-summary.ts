import { processNightlySummaries } from '@/lib/alerts/nightly-summary';
import type { CronJob } from '../types';

/** UTC hour at which the nightly summary report runs. */
const TARGET_HOUR_UTC = 5;

/**
 * Fires the "Wedding nightly summary for couples" alert for every wedding
 * that had RSVP activity in the last 24 hours.
 *
 * Gated to the 05:00 UTC hour so it behaves like a once-a-day report even
 * though this job is invoked every tick (every minute on non-Vercel
 * deployments, or via the extra 05:00 entry in vercel.json on Vercel).
 * The AlertRule's cooldown additionally guards against duplicate sends if
 * this hour window is entered more than once.
 */
export const nightlySummaryJob: CronJob = {
  name: 'nightly-summary',
  async run() {
    if (new Date().getUTCHours() !== TARGET_HOUR_UTC) {
      return { skipped: 1, checked: 0, triggered: 0, errors: 0 };
    }
    const result = await processNightlySummaries();
    return { skipped: 0, checked: result.checked, triggered: result.triggered, errors: result.errors };
  },
};
