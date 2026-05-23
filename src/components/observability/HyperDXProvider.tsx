'use client';

import { useEffect } from 'react';

export default function HyperDXProvider() {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_HYPERDX_API_KEY;
    if (!apiKey) return;
    import('@hyperdx/browser').then(({ default: HyperDX }) => {
      HyperDX.init({
        apiKey,
        service: 'wedding-management-frontend',
        consoleCapture: true,
        advancedNetworkCapture: true,
      });
    }).catch(() => {
      // Silently ignore: chunk may be blocked by ad-blockers or fail due to network issues
    });
  }, []);

  return null;
}
