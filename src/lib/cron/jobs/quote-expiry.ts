import { processExpiredQuotes } from '@/lib/alerts/quote-expiry';
import type { CronJob } from '../types';

/**
 * Marks SENT quotes past their expires_at as EXPIRED and fires
 * a QUOTE_EXPIRED alert for each affected planner.
 */
export const quoteExpiryJob: CronJob = {
  name: 'quote-expiry',
  async run() {
    const result = await processExpiredQuotes();
    return { expired: result.expired, errors: result.errors };
  },
};
