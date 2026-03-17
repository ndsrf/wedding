/**
 * Wedding Planner - Wedding Checklist Management Page
 *
 * Dedicated page for wedding planners to manage a specific wedding's checklist
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCoupleNames } from '@/hooks/useCoupleNames';
import { ChecklistEditor } from '@/components/admin/ChecklistEditor';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface ChecklistPageProps {
  params: Promise<{ id: string }>;
}

export default function ChecklistPage({ params }: ChecklistPageProps) {
  const t = useTranslations();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const weddingName = useCoupleNames(weddingId);
  useDocumentTitle(weddingName ? `Nupci - ${weddingName} - ${t('admin.checklist.title')}` : `Nupci - ${t('admin.checklist.title')}`);

  useEffect(() => {
    params.then(({ id }) => setWeddingId(id));
  }, [params]);

  if (!weddingId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <WeddingSpinner size="md" className="mx-auto" />
            <p className="mt-4 text-gray-500">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href={`/planner/weddings/${weddingId}`} className="text-gray-500 hover:text-gray-700 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('planner.checklist.title')}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {weddingName && `${weddingName} • `}
                  {t('planner.checklist.subtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChecklistEditor weddingId={weddingId} readOnly={false} />
      </main>
    </div>
  );
}
