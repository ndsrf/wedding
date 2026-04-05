/**
 * Cron job registry
 *
 * Add new jobs here — they run in the order listed, once per cron tick.
 * Each job must implement CronJob (see types.ts).
 */

import { quoteExpiryJob } from './jobs/quote-expiry';
import { alertDeliveriesJob } from './jobs/alert-deliveries';
import type { CronJob } from './types';

export const CRON_JOBS: CronJob[] = [
  quoteExpiryJob,      // 1. Expire overdue quotes → queues QUOTE_EXPIRED alerts
  alertDeliveriesJob,  // 2. Dispatch all pending alert deliveries (including above)
];
