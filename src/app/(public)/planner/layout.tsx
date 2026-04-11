'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import Footer from '@/components/Footer';
import { TrialModeBanner } from '@/components/shared/TrialModeBanner';
// TODO: import NupciBot here once the planner context (system prompt,
// available actions, data sources) is defined.
// import { NupciBot } from '@/components/shared/NupciBot';

export default function PlannerLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-pink-50">
        <TrialModeBanner statusEndpoint="/api/planner/trial-status" />
        <div className="flex-grow">
          {children}
        </div>
        <Footer />
      </div>
      {/* NupciBot planner variant — uncomment once the planner context is ready */}
      {/* <NupciBotPlanner /> */}
    </SessionProvider>
  );
}
