'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { WeddingAccessValidator } from '@/components/admin/WeddingAccessValidator';
import { VersionDisplay } from '@/components/shared/VersionDisplay';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <WeddingAccessValidator>
        <div className="min-h-screen flex flex-col">
          <div className="flex-grow">
            {children}
          </div>
          <VersionDisplay />
        </div>
      </WeddingAccessValidator>
    </SessionProvider>
  );
}
