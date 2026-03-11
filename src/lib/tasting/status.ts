/**
 * Tasting menu status helpers
 *
 * Logic:
 *   - If status === OPEN (manually set by admin): always open, no auto behaviour.
 *   - If status === CLOSED (default):
 *       • Auto-opens on tasting_date (same calendar day, UTC).
 *       • Auto-closes the day after tasting_date.
 *       • If no tasting_date: always closed.
 */

export type TastingMenuStoredStatus = 'OPEN' | 'CLOSED';
export type EffectiveStatus = 'OPEN' | 'CLOSED';

export function computeEffectiveStatus(
  status: TastingMenuStoredStatus,
  tasting_date: Date | null | undefined,
): EffectiveStatus {
  // Admin has manually forced it open — no auto-close.
  if (status === 'OPEN') return 'OPEN';

  // status === CLOSED — check if we should auto-open today.
  if (!tasting_date) return 'CLOSED';

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const eventDay = new Date(
    Date.UTC(tasting_date.getUTCFullYear(), tasting_date.getUTCMonth(), tasting_date.getUTCDate()),
  );

  return today.getTime() === eventDay.getTime() ? 'OPEN' : 'CLOSED';
}
