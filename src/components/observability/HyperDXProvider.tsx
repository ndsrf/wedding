'use client';

import { useEffect } from 'react';
import HyperDX from '@hyperdx/browser';

export default function HyperDXProvider() {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_HYPERDX_API_KEY;
    if (apiKey) {
      HyperDX.init({
        apiKey,
        service: 'wedding-management-frontend',
        consoleCapture: true,
        advancedNetworkCapture: true,
      });
    }
  }, []);

  return null;
}
