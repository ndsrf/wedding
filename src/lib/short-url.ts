/**
 * Short URL Generation and Resolution
 *
 * Produces short magic links in the format /{INITIALS}/{CODE} that HTTP-redirect
 * to the full /rsvp/{magic_token} page.
 *
 * INITIALS – derived from the couple's names (e.g. "Laura y Javier" → "LJ").
 *            Collisions across weddings are resolved by appending a number: LJ, LJ1, LJ2 …
 * CODE     – a 2-character base-62 string (a-zA-Z0-9).  62² = 3 844 combinations,
 *            more than enough for any single wedding.  Falls back to 3 characters
 *            if the unlikely case of exhaustion arises.
 */

import { prisma } from '@/lib/db/prisma';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Separators commonly used between two names across supported languages. */
const NAME_SEPARATORS = [' y ', ' & ', ' and ', ' e ', ' i ', ' und ', ' et ', ' och '];

// ---------------------------------------------------------------------------
// Initials – parsing & persistence
// ---------------------------------------------------------------------------

/**
 * Parse a couple-names string into a 2-letter upper-case initials string.
 *
 * Examples:
 *   "Laura y Javier"   → "LJ"
 *   "Ana & Pedro"      → "AP"
 *   "María"            → "MA"   (single name fallback: first 2 chars)
 */
export function parseInitials(coupleNames: string): string {
  const trimmed = coupleNames.trim();

  for (const sep of NAME_SEPARATORS) {
    const idx = trimmed.toLowerCase().indexOf(sep.toLowerCase());
    if (idx !== -1) {
      const first  = trimmed.slice(0, idx).trim();
      const second = trimmed.slice(idx + sep.length).trim();
      if (first.length > 0 && second.length > 0) {
        return (first[0] + second[0]).toUpperCase();
      }
    }
  }

  // Fallback: first two characters of the string
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * Return (and persist if needed) the short-URL initials for a wedding.
 * Handles collisions: LJ → LJ1 → LJ2 …
 */
export async function ensureWeddingInitials(weddingId: string): Promise<string> {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { short_url_initials: true, couple_names: true },
  });

  if (!wedding) throw new Error('Wedding not found');
  if (wedding.short_url_initials) return wedding.short_url_initials;

  const base = parseInitials(wedding.couple_names);
  let candidate = base;
  let suffix    = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const taken = await prisma.wedding.findFirst({
      where: { short_url_initials: candidate },
    });

    if (!taken) {
      await prisma.wedding.update({
        where: { id: weddingId },
        data:  { short_url_initials: candidate },
      });
      return candidate;
    }

    suffix   += 1;
    candidate = `${base}${suffix}`;
  }
}

// ---------------------------------------------------------------------------
// Short code – generation & persistence
// ---------------------------------------------------------------------------

/** Generate a random base-62 string of the given length. */
function randomCode(length: number): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += BASE62[Math.floor(Math.random() * BASE62.length)];
  }
  return code;
}

/**
 * Generate a short code that is unique within the given wedding.
 * Tries 2-char codes first (3 844 slots); falls back to 3-char (238 328 slots).
 */
async function generateShortCode(weddingId: string): Promise<string> {
  for (let len = 2; len <= 3; len++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = randomCode(len);
      const taken = await prisma.family.findFirst({
        where: { wedding_id: weddingId, short_url_code: code },
        select: { id: true },
      });
      if (!taken) return code;
    }
  }
  throw new Error('Failed to generate a unique short code');
}

/**
 * Ensure the given family has a short_url_code persisted and return it.
 */
async function ensureShortCode(familyId: string, weddingId: string): Promise<string> {
  const family = await prisma.family.findUnique({
    where:  { id: familyId },
    select: { short_url_code: true },
  });

  if (!family) throw new Error('Family not found');
  if (family.short_url_code) return family.short_url_code;

  const code = await generateShortCode(weddingId);
  await prisma.family.update({
    where: { id: familyId },
    data:  { short_url_code: code },
  });
  return code;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Return the short-URL **path** for a family, creating initials / code if needed.
 *
 * Example return value: "/LJ/aB"
 */
export async function getShortUrlPath(familyId: string): Promise<string> {
  const family = await prisma.family.findUnique({
    where:  { id: familyId },
    select: { wedding_id: true },
  });
  if (!family) throw new Error('Family not found');

  const initials = await ensureWeddingInitials(family.wedding_id);
  const code     = await ensureShortCode(familyId, family.wedding_id);

  return `/${initials}/${code}`;
}

/**
 * Resolve a short-URL pair back to the current magic_token of the family.
 * Returns null when no match is found.
 *
 * Single joined query – avoids a round-trip for the wedding lookup.
 */
export async function resolveShortUrl(initials: string, code: string): Promise<string | null> {
  const family = await prisma.family.findFirst({
    where: {
      short_url_code: code,
      wedding:        { short_url_initials: initials },
    },
    select: { magic_token: true },
  });

  return family?.magic_token ?? null;
}

/**
 * Eagerly generate and persist the short URL for a family inside an existing
 * Prisma transaction.  Call this at family-creation time so the short code is
 * ready immediately.
 *
 * @param tx        – the Prisma transaction client
 * @param familyId  – the newly created family id
 * @param weddingId – the wedding id
 */
export async function assignShortCode(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  familyId: string,
  weddingId: string,
): Promise<void> {
  // Generate a unique code within this transaction
  for (let len = 2; len <= 3; len++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = randomCode(len);
      const taken = await tx.family.findFirst({
        where: { wedding_id: weddingId, short_url_code: code },
        select: { id: true },
      });
      if (!taken) {
        await tx.family.update({
          where: { id: familyId },
          data:  { short_url_code: code },
        });
        return;
      }
    }
  }
  throw new Error('Failed to generate a unique short code');
}
