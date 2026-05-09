/**
 * Planner - Wedding Schedule Page (thin wrapper)
 *
 * Resolves planner context (wedding ID from URL) and delegates all rendering
 * to the shared SchedulePageContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SchedulePageContent } from '@/components/shared/SchedulePageContent';

export default function PlannerWeddingSchedulePage() {
  const { id: weddingId } = useParams() as { id: string };

  return (
    <SchedulePageContent
      apiPaths={{
        schedule: `/api/planner/weddings/${weddingId}/schedule`,
        schedulePdf: `/api/planner/weddings/${weddingId}/schedule/pdf`,
      }}
      isPlanner={true}
      header={
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link
                href={`/planner/weddings/${weddingId}`}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-100">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Cronograma</h1>
                  <p className="text-xs text-gray-500">Vista completa del planner con todas las etapas</p>
                </div>
              </div>
            </div>
          </div>
        </header>
      }
    />
  );
}
