/**
 * Short URL redirect page
 * /inv/{INITIALS}/{SHORT_CODE}  →  /rsvp/{magic_token}[?query…]
 *
 * The server only validates the URL format and renders the spinner immediately —
 * no database access happens here.  Token resolution is done client-side via
 * /api/inv/[initials]/[code] so the spinner appears as fast as possible.
 *
 * ISR caches the spinner HTML at the CDN edge for 24 h, so repeat visitors
 * get the spinner in ~50 ms from edge without hitting the origin at all.
 */

import { notFound } from 'next/navigation';
import RedirectWithSpinner from './RedirectWithSpinner';

export const revalidate  = 86400; // 24 h CDN edge cache for the spinner HTML
export const dynamicParams = true;

// Initials: 1-3 uppercase ASCII letters followed by 1-4 alphanumeric chars
const INITIALS_RE = /^[A-Z]{1,3}[a-zA-Z0-9]{1,4}$/;
// Short code: 5-6 base-62 characters
const CODE_RE     = /^[a-zA-Z0-9]{5,6}$/;

interface Props {
  params: Promise<{ initials: string; shortCode: string }>;
}

export default async function ShortUrlPage({ params }: Props) {
  const { initials, shortCode } = await params;

  if (!INITIALS_RE.test(initials) || !CODE_RE.test(shortCode)) {
    notFound();
  }

  return <RedirectWithSpinner initials={initials} shortCode={shortCode} />;
}
