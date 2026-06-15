'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface Props {
  initials:  string;
  shortCode: string;
}

export default function RedirectWithSpinner({ initials, shortCode }: Props) {
  const router  = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    // AbortController is polyfilled by Next.js but guard defensively for very old browsers
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;

    fetch(`/api/inv/${encodeURIComponent(initials)}/${encodeURIComponent(shortCode)}`, {
      signal: controller?.signal,
    })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(({ token }: { token: string }) => {
        // Forward any query params on the current URL (channel tracking, etc.)
        const qs = window.location.search;
        router.push(`/rsvp/${token}${qs}`);
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(true);
        // Redirect to home after a brief pause so the user sees the error message
        setTimeout(() => router.replace('/'), 2500);
      });

    return () => controller?.abort();
  }, [initials, shortCode, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4">
      <div className="text-center">
        <WeddingSpinner size="lg" className="mx-auto mb-8" initials={error ? undefined : initials} />
        {error ? (
          <p className="text-gray-500 text-base font-light">Link not found. Redirecting…</p>
        ) : (
          <p className="text-gray-600 text-lg font-light">Loading / Cargando / Caricamento / Laden / Chargement…</p>
        )}
      </div>
    </div>
  );
}
