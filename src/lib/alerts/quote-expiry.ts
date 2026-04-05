/**
 * Alert System — Quote expiry processor
 *
 * Finds SENT quotes whose expires_at has passed, marks them EXPIRED,
 * and fires a QUOTE_EXPIRED alert so the planner is notified.
 *
 * Called from the Vercel Cron (and the in-process scheduler on non-Vercel).
 */

import { prisma } from '@/lib/db/prisma';
import { triggerAlert } from './trigger';

export interface ExpiredQuotesResult {
  expired: number;
  errors: number;
}

/**
 * Scan for SENT quotes that are past their expires_at date,
 * transition them to EXPIRED, and trigger the QUOTE_EXPIRED alert.
 */
export async function processExpiredQuotes(): Promise<ExpiredQuotesResult> {
  const now = new Date();

  // Find all SENT quotes that have expired
  const expiredQuotes = await prisma.quote.findMany({
    where: {
      status: 'SENT',
      expires_at: { lte: now },
    },
    select: {
      id: true,
      couple_names: true,
      planner_id: true,
      expires_at: true,
      total: true,
      currency: true,
    },
  });

  if (expiredQuotes.length === 0) return { expired: 0, errors: 0 };

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  let expired = 0;
  let errors = 0;

  for (const quote of expiredQuotes) {
    try {
      // Mark as EXPIRED
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'EXPIRED' },
      });

      // Queue alert deliveries sequentially.
      // skipDispatch=true prevents N concurrent processPendingDeliveries calls —
      // the cron's alertDeliveriesJob dispatches everything in one pass after this loop.
      await triggerAlert({
        event_type: 'QUOTE_EXPIRED',
        planner_id: quote.planner_id,
        skipDispatch: true,
        metadata: {
          quoteId: quote.id,
          coupleNames: quote.couple_names,
          total: quote.total?.toString() ?? '',
          currency: quote.currency,
          expiredAt: quote.expires_at?.toISOString() ?? '',
          quoteLink: `${appUrl}/planner/quotes-finances?tab=quotes&ref=${quote.id}`,
        },
      });

      expired++;
    } catch (err) {
      errors++;
      console.error(`[QuoteExpiry] Failed to process quote ${quote.id}:`, err);
    }
  }

  if (expired > 0) {
    console.log(`[QuoteExpiry] Marked ${expired} quote(s) as EXPIRED`);
  }

  return { expired, errors };
}
