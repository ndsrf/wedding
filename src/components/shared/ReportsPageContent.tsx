/**
 * Shared Reports Page Content
 *
 * Per-wedding reports page shell used by both admin and planner.
 * Contains only the layout wrapper; all report logic lives in ReportsView.
 *
 * Props:
 *  - apiBasePath  Base path for report API calls (e.g. /api/admin/reports or
 *                 /api/planner/weddings/:id/reports)
 *  - header       Role-specific header/nav rendered above the content area
 */

'use client';

import { ReportsView } from '@/components/admin/ReportsView';

interface ReportsPageContentProps {
  apiBasePath: string;
  header: React.ReactNode;
}

export function ReportsPageContent({ apiBasePath, header }: ReportsPageContentProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {header}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReportsView apiBasePath={apiBasePath} />
      </main>
    </div>
  );
}
