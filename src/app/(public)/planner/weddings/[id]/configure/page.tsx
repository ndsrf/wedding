/**
 * Wedding Planner - Configure Wedding Page (thin wrapper)
 *
 * Resolves planner-specific context (wedding ID from URL, API paths) and
 * delegates all rendering to the shared ConfigurePageContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCoupleNames } from '@/hooks/useCoupleNames';
import { ConfigurePageContent } from '@/components/shared/ConfigurePageContent';

export default function PlannerConfigurePage() {
  const t = useTranslations('admin.configure');
  const { id: weddingId } = useParams() as { id: string };
  const weddingName = useCoupleNames(weddingId);
  useDocumentTitle(buildNupciTitle(t('title'), weddingName));

  const plannerBase = `/api/planner/weddings/${weddingId}`;

  return (
    <ConfigurePageContent
      apiPaths={{
        weddingApi: `${plannerBase}/configure`,
        deleteAllGuests: `${plannerBase}/guests/delete-all`,
      }}
      backUrl={`/planner/weddings/${weddingId}`}
      header={
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Link
                href={`/planner/weddings/${weddingId}`}
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                {weddingName && <p className="mt-0.5 text-sm text-gray-500">{weddingName}</p>}
              </div>
            </div>
          </div>
        </header>
      }
    />
  );
}
