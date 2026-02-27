/**
 * Public Wedding Landing Page
 * /w/[code]  →  shows wedding details and asks for phone/email
 *              to look up the guest's personalised invitation.
 *
 * [code] is the wedding's short_url_initials (e.g. "LJ").
 *
 * After a successful lookup the client is redirected to:
 *   /inv/[code]/[guestcode]
 *
 * Language is detected from the visitor's browser (Accept-Language
 * header server-side, navigator.language client-side).
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';
import { getLanguageFromRequest } from '@/lib/i18n/server';
import type { Language } from '@/lib/i18n/config';
import WeddingLookupForm from './WeddingLookupForm';

// ── Validation ────────────────────────────────────────────────────────────────
// Initials: 2-3 uppercase ASCII letters, optionally followed by digits
const INITIALS_RE = /^[A-Z]{2,3}\d*$/;

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const initials = code.toUpperCase();

  if (!INITIALS_RE.test(initials)) return {};

  const wedding = await prisma.wedding.findFirst({
    where: { short_url_initials: initials, is_disabled: false },
    select: { couple_names: true },
  });

  if (!wedding) return {};

  return {
    title: wedding.couple_names,
    description: `Find your invitation to ${wedding.couple_names}'s wedding`,
    robots: { index: false, follow: false },
  };
}

export default async function WeddingLandingPage({ params }: Props) {
  const { code } = await params;
  const initials = code.toUpperCase();

  if (!INITIALS_RE.test(initials)) {
    notFound();
  }

  const wedding = await prisma.wedding.findFirst({
    where: {
      short_url_initials: initials,
      is_disabled: false,
    },
    select: {
      couple_names: true,
      wedding_date: true,
      wedding_time: true,
      location: true,
      dress_code: true,
      additional_info: true,
      default_language: true,
      wedding_country: true,
    },
  });

  if (!wedding) {
    notFound();
  }

  // Detect language from browser (Accept-Language header / NEXT_LOCALE cookie)
  const serverLanguage = await getLanguageFromRequest();

  return (
    <WeddingLookupForm
      initials={initials}
      serverLanguage={serverLanguage}
      wedding={{
        coupleNames: wedding.couple_names,
        weddingDate: wedding.wedding_date.toISOString(),
        weddingTime: wedding.wedding_time,
        location: wedding.location ?? undefined,
        dressCode: wedding.dress_code ?? undefined,
        additionalInfo: wedding.additional_info ?? undefined,
        defaultLanguage: wedding.default_language.toLowerCase() as Language,
        weddingCountry: wedding.wedding_country,
      }}
    />
  );
}
