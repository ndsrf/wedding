'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCoupleNames } from '@/hooks/useCoupleNames';
import { WeddingNotesEditor } from '@/components/shared/WeddingNotesEditor';
import PrivateHeader from '@/components/PrivateHeader';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface NotasPageProps {
  params: Promise<{ id: string }>;
}

export default function PlannerNotasPage({ params }: NotasPageProps) {
  const t = useTranslations();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const weddingName = useCoupleNames(weddingId);
  useDocumentTitle(buildNupciTitle(t('notes.title'), weddingName));

  useEffect(() => {
    params.then(({ id }) => setWeddingId(id));
  }, [params]);

  if (!weddingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <WeddingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PrivateHeader
        backUrl={`/planner/weddings/${weddingId}`}
        title={t('notes.title')}
        subtitle={weddingName ?? undefined}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
              <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{t('notes.title')}</h1>
          </div>
          <p className="text-sm text-gray-500 ml-12">{t('notes.subtitle')}</p>
        </div>

        <WeddingNotesEditor
          weddingId={weddingId}
          authEndpoint={`/api/planner/weddings/${weddingId}/notes-liveblocks-auth`}
          usersEndpoint={`/api/planner/weddings/${weddingId}/notes-users`}
        />
      </main>
    </div>
  );
}
