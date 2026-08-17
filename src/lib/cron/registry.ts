/**
 * Cron job registry
 *
 * Add new jobs here — they run in the order listed, once per cron tick.
 * Each job must implement CronJob (see types.ts).
 */

import { quoteExpiryJob } from './jobs/quote-expiry';
import { nightlySummaryJob } from './jobs/nightly-summary';
import { spotifySyncJob } from './jobs/spotify-sync';
import { alertDeliveriesJob } from './jobs/alert-deliveries';
import type { CronJob } from './types';

export const CRON_JOBS: CronJob[] = [
  quoteExpiryJob,      // 1. Expire overdue quotes → queues QUOTE_EXPIRED alerts
  nightlySummaryJob,   // 2. Wedding nightly summary → queues NIGHTLY_SUMMARY alerts (paced by AlertRule cooldown)
  spotifySyncJob,      // 3. Resolve AI song suggestions + sync each wedding's Spotify playlist (no notifications)
  alertDeliveriesJob,  // 4. Dispatch all pending alert deliveries (including above)
];
