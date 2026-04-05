/**
 * Alert System — public API
 *
 * Usage:
 *   import { triggerAlert } from '@/lib/alerts';
 *
 *   // Fire-and-forget (don't await — won't block the response)
 *   void triggerAlert({ event_type: 'RSVP_SUBMITTED', wedding_id, metadata: { familyName } });
 *
 *   // Or await it when you need to ensure alerts are queued before responding
 *   await triggerAlert({ event_type: 'PAYMENT_RECEIVED', wedding_id, metadata: { amount } });
 */

export { triggerAlert } from './trigger';
export { processPendingDeliveries } from './processor';
export { processExpiredQuotes } from './quote-expiry';
export { BUILTIN_ALERTS, builtinRuleName, findDefinition } from './definitions';
export type { AlertContext } from './types';
export type { AlertTemplateVars } from './types';
