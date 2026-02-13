'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { WeddingAccessValidator } from '@/components/admin/WeddingAccessValidator';
import Footer from '@/components/Footer';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <WeddingAccessValidator>
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-pink-50">
          <div className="flex-grow">
            {children}
          </div>
          <Footer />
        </div>
      </WeddingAccessValidator>
    </SessionProvider>
  );
}
