/**
 * Redirect with Loading Spinner
 * Shows a loading spinner before redirecting to the RSVP page
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RedirectWithSpinnerProps {
  destinationUrl: string;
}

export default function RedirectWithSpinner({ destinationUrl }: RedirectWithSpinnerProps) {
  const router = useRouter();

  useEffect(() => {
    // Redirect after a brief delay to show the spinner
    const timer = setTimeout(() => {
      router.push(destinationUrl);
    }, 500);

    return () => clearTimeout(timer);
  }, [destinationUrl, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Loading your invitation...</p>
      </div>
    </div>
  );
}
