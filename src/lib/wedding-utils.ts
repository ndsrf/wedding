import type { Location, Wedding, ScheduleReferenceDate } from '@prisma/client';

type WeddingWithMainEventLocation = Pick<Wedding, 'location'> & {
  main_event_location: Pick<Location, 'name'> | null;
};

export function getWeddingDisplayLocation(wedding: WeddingWithMainEventLocation): string | null {
  return wedding.main_event_location?.name ?? wedding.location;
}

/**
 * Resolve the concrete due date for a contract payment schedule item.
 *
 * @param item - Schedule item with reference type, offset, and optional fixed date
 * @param weddingDate - Fallback base date when payment_schedule_wedding_date is absent
 * @param scheduleWeddingDate - Planner-set wedding date override for the schedule
 * @param scheduleSigningDate - Planner-set signing date for the schedule
 */
export function resolvePaymentScheduleDate(
  item: {
    reference_date: ScheduleReferenceDate;
    days_offset: number;
    fixed_date: Date | null;
  },
  weddingDate: Date,
  scheduleWeddingDate: Date | null,
  scheduleSigningDate: Date | null,
): Date | null {
  if (item.reference_date === 'FIXED_DATE') {
    return item.fixed_date;
  }
  const base =
    item.reference_date === 'WEDDING_DATE'
      ? (scheduleWeddingDate ?? weddingDate)
      : (scheduleSigningDate ?? null);
  if (!base) return null;
  const d = new Date(base);
  d.setDate(d.getDate() + item.days_offset);
  return d;
}

/**
 * Derive a 1–2 letter initials string from a couple names string.
 * Strips connector words (and / & / y / et) and special characters,
 * then takes the first letter of each of the first two words.
 * Falls back to "W" when the input is empty or null.
 */
export function toInitials(names: string | null | undefined): string {
  if (!names) return 'W';
  const words = names
    .replace(/\s+(&|and|y|et)\s+/i, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return 'W';
}
