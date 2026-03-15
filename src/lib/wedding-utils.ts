import type { Location, Wedding } from '@prisma/client';

type WeddingWithMainEventLocation = Pick<Wedding, 'location'> & {
  main_event_location: Pick<Location, 'name'> | null;
};

export function getWeddingDisplayLocation(wedding: WeddingWithMainEventLocation): string | null {
  return wedding.main_event_location?.name ?? wedding.location;
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
