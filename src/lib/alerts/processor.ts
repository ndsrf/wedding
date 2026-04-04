/**
 * Alert System — batch processor
 *
 * Called by the Vercel Cron job (and optionally fire-and-forget after a trigger).
 * Picks up PENDING deliveries and FAILED ones whose next_retry_at has passed,
 * then dispatches them one by one.
 *
 * Also rolls up delivery statuses into the parent Alert status.
 */

import { prisma } from '@/lib/db/prisma';
import { dispatchDelivery } from './dispatch';

export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

/**
 * Process up to `limit` pending/retryable alert deliveries.
 * Safe to call concurrently — the SENDING transition in dispatchDelivery
 * acts as an optimistic lock.
 */
export async function processPendingDeliveries(limit = 50): Promise<ProcessResult> {
  const now = new Date();

  // Prisma doesn't support cross-field comparisons (attempts < max_attempts),
  // so we fetch broadly and filter in JS.
  const deliveries = await prisma.alertDelivery.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      OR: [
        { status: 'PENDING', next_retry_at: null },
        { next_retry_at: { lte: now } },
      ],
    },
    orderBy: { created_at: 'asc' },
    take: limit,
  });

  const eligibleIds = deliveries
    .filter((d) => d.attempts < d.max_attempts)
    .map((d) => d.id);

  if (eligibleIds.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, skipped: deliveries.length };
  }

  const eligible = deliveries.filter((d) => eligibleIds.includes(d.id));

  let succeeded = 0;
  let failed = 0;

  for (const delivery of eligible) {
    await dispatchDelivery(delivery);

    // Re-read status to count outcome
    const updated = await prisma.alertDelivery.findUnique({
      where: { id: delivery.id },
      select: { status: true },
    });
    if (updated?.status === 'SENT' || updated?.status === 'DELIVERED') {
      succeeded++;
    } else {
      failed++;
    }
  }

  // Roll-up: update parent Alert statuses
  const alertIds = [...new Set(eligible.map((d) => d.alert_id))];
  await rollUpAlertStatuses(alertIds);

  return {
    processed: eligible.length,
    succeeded,
    failed,
    skipped: deliveries.length - eligible.length,
  };
}

/**
 * Recompute and persist the status of each Alert based on its deliveries.
 */
async function rollUpAlertStatuses(alertIds: string[]): Promise<void> {
  for (const alertId of alertIds) {
    const deliveries = await prisma.alertDelivery.findMany({
      where: { alert_id: alertId },
      select: { status: true, attempts: true, max_attempts: true },
    });

    if (deliveries.length === 0) continue;

    const allTerminal = deliveries.every(
      (d) =>
        d.status === 'SENT' ||
        d.status === 'DELIVERED' ||
        d.status === 'SKIPPED' ||
        (d.status === 'FAILED' && d.attempts >= d.max_attempts),
    );
    const allSuccess = deliveries.every(
      (d) => d.status === 'SENT' || d.status === 'DELIVERED' || d.status === 'SKIPPED',
    );
    const allFailed = deliveries.every(
      (d) => d.status === 'FAILED' && d.attempts >= d.max_attempts,
    );

    let status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
    if (!allTerminal) {
      status = 'PROCESSING';
    } else if (allSuccess) {
      status = 'COMPLETED';
    } else if (allFailed) {
      status = 'FAILED';
    } else {
      status = 'PARTIAL';
    }

    await prisma.alert.update({
      where: { id: alertId },
      data: {
        status,
        processed_at: allTerminal ? new Date() : null,
      },
    });
  }
}
