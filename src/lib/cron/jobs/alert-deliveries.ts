import { processPendingDeliveries } from '@/lib/alerts/processor';
import type { CronJob } from '../types';

/**
 * Dispatches PENDING alert deliveries and retries FAILED ones
 * whose back-off window has elapsed.
 */
export const alertDeliveriesJob: CronJob = {
  name: 'alert-deliveries',
  async run() {
    const result = await processPendingDeliveries(50);
    return {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      skipped: result.skipped,
    };
  },
};
