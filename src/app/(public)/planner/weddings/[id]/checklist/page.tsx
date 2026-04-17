/**
 * Wedding Planner - Checklist Page (thin wrapper)
 *
 * Resolves planner-specific context (wedding ID from URL) and delegates all
 * rendering to the shared ChecklistPageContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCoupleNames } from '@/hooks/useCoupleNames';
import { ChecklistPageContent } from '@/components/shared/ChecklistPageContent';

export default function ChecklistPage() {
  const t = useTranslations();
  const { id: weddingId } = useParams() as { id: string };
  const weddingName = useCoupleNames(weddingId);
  useDocumentTitle(buildNupciTitle(t('admin.checklist.title'), weddingName));

  return (
    <ChecklistPageContent
      weddingId={weddingId}
      isReadOnly={false}
      header={
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Link href={`/planner/weddings/${weddingId}`} className="text-gray-500 hover:text-gray-700 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('admin.checklist.title')}</h1>
                {weddingName && (
                  <p className="mt-0.5 text-sm text-gray-500">
                    {weddingName} &bull; {t('admin.checklist.subtitle')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>
      }
    />
  );
}
