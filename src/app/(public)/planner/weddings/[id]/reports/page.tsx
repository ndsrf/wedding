/**
 * Wedding Planner — Per-Wedding Reports Page
 */

'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCoupleNames } from '@/hooks/useCoupleNames';
import { ReportsPageContent } from '@/components/shared/ReportsPageContent';

interface ReportsPageProps {
  params: Promise<{ id: string }>;
}

export default function ReportsPage({ params }: ReportsPageProps) {
  const t = useTranslations();
  const { id: weddingId } = use(params);
  const weddingName = useCoupleNames(weddingId);
  useDocumentTitle(buildNupciTitle(t('admin.reports.title'), weddingName));

  const header = (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link
          href={`/planner/weddings/${weddingId}`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← {t('common.buttons.back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.reports.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('admin.reports.subtitle')}</p>
        {weddingName && (
          <p className="mt-0.5 text-sm text-rose-600 font-medium">{weddingName}</p>
        )}
      </div>
    </header>
  );

  return (
    <ReportsPageContent
      apiBasePath={`/api/planner/weddings/${weddingId}/reports`}
      header={header}
    />
  );
}
