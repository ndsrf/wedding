'use client';

import type { ReactNode } from 'react';
import Footer from '@/components/Footer';
import { TrialModeBanner } from '@/components/shared/TrialModeBanner';

export default function PlannerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-pink-50">
      <TrialModeBanner statusEndpoint="/api/planner/trial-status" />
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
    </div>
  );
}
