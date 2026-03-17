/**
 * Planner – Seating Plan Page
 * /planner/weddings/[id]/seating
 *
 * Thin wrapper: resolves planner context and delegates to SeatingPageContent.
 */

'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCoupleNames } from '@/hooks/useCoupleNames';
import { SeatingPageContent } from '@/components/shared/SeatingPageContent';

export default function PlannerSeatingPage() {
  const { id: weddingId } = useParams() as { id: string };
  const t = useTranslations();
  const weddingName = useCoupleNames(weddingId);
  useDocumentTitle(weddingName ? `Nupci - ${weddingName} - ${t('admin.seating.title')}` : `Nupci - ${t('admin.seating.title')}`);

  return (
    <SeatingPageContent
      apiBase={`/api/planner/weddings/${weddingId}/seating`}
      header={
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link
                href={`/planner/weddings/${weddingId}`}
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  🪑 {t('admin.seating.title')}
                </h1>
                <p className="text-sm text-gray-600">{t('admin.seating.subtitle')}</p>
              </div>
            </div>
          </div>
        </header>
      }
    />
  );
}
