/**
 * Redirect with Loading Spinner
 * Shows a wedding-themed loading spinner before redirecting to the RSVP page.
 *
 * Performance:
 * - router.prefetch() is called immediately on mount so the RSVP page starts
 *   loading in the background while the spinner is visible.
 * - The 500 ms spinner delay gives Next.js time to prefetch the RSVP page,
 *   so by the time router.push() fires the page is already in the cache.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface RedirectWithSpinnerProps {
  destinationUrl: string;
  initials?: string;
}

export default function RedirectWithSpinner({ destinationUrl, initials }: RedirectWithSpinnerProps) {
  const router = useRouter();

  useEffect(() => {
    // Prefetch the RSVP page immediately so it loads in the background
    // while the spinner is visible.  By the time the redirect fires the
    // page data is already in the Next.js router cache.
    router.prefetch(destinationUrl);

    // Redirect after a brief delay to show the spinner
    const timer = setTimeout(() => {
      router.push(destinationUrl);
    }, 500);

    return () => clearTimeout(timer);
  }, [destinationUrl, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4">
      <div className="text-center">
        <WeddingSpinner size="lg" className="mx-auto mb-8" initials={initials} />
        <p className="text-gray-600 text-lg font-light">Loading / Cargando / Caricamento / Laden / Chargement...</p>
      </div>
    </div>
  );
}
