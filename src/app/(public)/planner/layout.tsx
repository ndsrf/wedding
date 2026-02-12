'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { VersionDisplay } from '@/components/shared/VersionDisplay';

export default function PlannerLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col">
        <div className="flex-grow">
          {children}
        </div>
        <VersionDisplay />
      </div>
    </SessionProvider>
  );
}
