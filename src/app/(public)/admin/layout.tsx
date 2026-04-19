'use client';

import type { ReactNode } from 'react';
import { WeddingAccessValidator } from '@/components/admin/WeddingAccessValidator';
import Footer from '@/components/Footer';
import { TrialModeBanner } from '@/components/shared/TrialModeBanner';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <WeddingAccessValidator>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-pink-50">
        <TrialModeBanner statusEndpoint="/api/admin/trial-status" />
        <div className="flex-grow">
          {children}
        </div>
        <Footer />
      </div>
    </WeddingAccessValidator>
  );
}
