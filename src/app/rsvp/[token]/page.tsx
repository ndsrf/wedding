/**
 * Guest RSVP Page (Server Component)
 * /rsvp/[token]
 *
 * Main RSVP page for guests accessed via magic link.
 * Optimized for performance:
 * - Server-side data fetching (no double-load)
 * - Server-side locale synchronization (no client-side reload)
 * - Lightweight initial payload
 */

import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import Link from 'next/link';
import { getRSVPPageData } from '@/lib/guests/rsvp';
import { getTranslations as getI18n } from '@/lib/i18n/server';
import { Language } from '@/lib/i18n/config';
import RSVPPageClient from './RSVPPageClient';
import { Metadata } from 'next';

interface Props {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ channel?: string }>;
}

/**
 * Generate dynamic metadata for the RSVP page
 */
export async function generateMetadata({ params }: { params: Props['params'] }): Promise<Metadata> {
  const { token } = await params;
  const result = await getRSVPPageData(token, null, true); // skip tracking for metadata

  if (!result.success || !result.data) {
    return { title: 'Wedding RSVP' };
  }

  const { wedding } = result.data;
  return {
    title: `${wedding.couple_names} - Wedding RSVP`,
    description: `Join us for our wedding on ${new Date(wedding.wedding_date).toLocaleDateString()}.`,
  };
}

export default async function GuestRSVPPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { channel } = await searchParams;

  // 1. Fetch RSVP data on the server
  const result = await getRSVPPageData(token, channel);

  if (!result.success || !result.data) {
    const errorMsg = result.error?.message || 'An error occurred while loading the RSVP page';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
             Error
          </h1>
          <p className="text-lg text-gray-600 mb-6">{errorMsg}</p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
             Go Home
          </Link>
        </div>
      </div>
    );
  }

  const data = result.data;
  const familyLang = data.family.preferred_language.toLowerCase() as Language;

  // 2. Load translations for the family's preferred language
  // This ensures the page is rendered in the correct language immediately
  const { messages } = await getI18n(familyLang);

  return (
    <>
      {/* Performance: Preconnect to font domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      <NextIntlClientProvider locale={familyLang} messages={messages}>
        <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          </div>
        </div>
      }>
        <RSVPPageClient 
          token={token} 
          initialData={data} 
          channel={channel} 
        />
      </Suspense>
    </NextIntlClientProvider>
    </>
  );
}