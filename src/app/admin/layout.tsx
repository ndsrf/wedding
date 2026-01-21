'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { WeddingAccessValidator } from '@/components/admin/WeddingAccessValidator';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <WeddingAccessValidator>
        {children}
      </WeddingAccessValidator>
    </SessionProvider>
  );
}
