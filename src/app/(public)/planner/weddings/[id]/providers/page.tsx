'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ProvidersPageContent } from '@/components/shared/ProvidersPageContent';

export default function PlannerWeddingProvidersPage() {
  const t = useTranslations();
  const { id: weddingId } = useParams() as { id: string };
  const [weddingName, setWeddingName] = useState('');
  useDocumentTitle(weddingName ? `Nupci - ${weddingName} - ${t('planner.providers.title')}` : `Nupci - ${t('planner.providers.title')}`);

  useEffect(() => {
    fetch(`/api/planner/weddings/${weddingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) setWeddingName(data.data.couple_names || '');
      })
      .catch(console.error);
  }, [weddingId]);

  return (
    <ProvidersPageContent
      weddingId={weddingId}
      isPlanner={true}
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
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('planner.providers.title') || 'Providers'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {weddingName && `${weddingName} • `}
                  {t('planner.providers.description') || 'Manage providers and payments'}
                </p>
              </div>
            </div>
          </div>
        </header>
      }
    />
  );
}
