/**
 * Short URL redirect page
 * /{INITIALS}/{SHORT_CODE}  →  307  →  /rsvp/{magic_token}[?query…]
 *
 * Resolves the short URL against the database and issues a server-side
 * redirect.  Any query-string parameters (e.g. ?channel=sms) are forwarded
 * to the destination so that channel-attribution tracking is preserved.
 *
 * Returns 404 (via notFound()) when the initials/code pair does not exist.
 */

import { notFound, redirect } from 'next/navigation';
import { resolveShortUrl } from '@/lib/short-url';

// Initials: 2-3 uppercase ASCII letters, optionally followed by digits (LJ, LJ1, AB12…)
const INITIALS_RE = /^[A-Z]{2,3}\d*$/;
// Short code: exactly 2-3 base-62 characters
const CODE_RE     = /^[a-zA-Z0-9]{2,3}$/;

interface Props {
  params:      Promise<{ initials: string; shortCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ShortUrlPage({ params, searchParams }: Props) {
  const { initials, shortCode } = await params;

  // ── format gate ──────────────────────────────────────────────────────────
  if (!INITIALS_RE.test(initials) || !CODE_RE.test(shortCode)) {
    notFound();
  }

  // ── DB look-up ───────────────────────────────────────────────────────────
  const magicToken = await resolveShortUrl(initials, shortCode);
  if (!magicToken) {
    notFound();
  }

  // ── forward query params (channel tracking, etc.) ───────────────────────
  const query = await searchParams;
  const qs    = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      const values = Array.isArray(value) ? value : [value];
      for (const v of values) qs.append(key, v);
    }
  }

  const qsSuffix = qs.toString();
  redirect(`/rsvp/${magicToken}${qsSuffix ? `?${qsSuffix}` : ''}`);
}
