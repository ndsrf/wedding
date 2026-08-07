import { processNightlySummaries } from '@/lib/alerts/nightly-summary';
import type { CronJob } from '../types';

/**
 * Fires the "Wedding nightly summary for couples" alert for every wedding
 * that had RSVP activity in the last 24 hours.
 *
 * Runs on every tick, same as the other cron jobs — nothing here decides
 * "is it time yet". Pacing is left entirely to the AlertRule's cooldown
 * (see definitions.ts), same mechanism the rest of the alert system uses.
 */
export const nightlySummaryJob: CronJob = {
  name: 'nightly-summary',
  async run() {
    const result = await processNightlySummaries();
    return { checked: result.checked, triggered: result.triggered, errors: result.errors };
  },
};
