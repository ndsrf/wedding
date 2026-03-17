/**
 * Planner Wedding Menu Selection Page
 *
 * Thin wrapper that resolves planner-specific context (wedding ID from URL,
 * API paths) and delegates all rendering to the shared MenuPageContent
 * component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { MenuPageContent } from '@/components/shared/MenuPageContent';

export default function PlannerMenuPage() {
  const params = useParams();
  const weddingId = params.id as string;
  const t = useTranslations('admin.menu');
  const [weddingName, setWeddingName] = useState('');
  useDocumentTitle(weddingName ? `Nupci - ${weddingName} - ${t('title')}` : `Nupci - ${t('title')}`);

  useEffect(() => {
    fetch(`/api/planner/weddings/${weddingId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setWeddingName(data.data?.couple_names ?? '');
      })
      .catch(() => {});
  }, [weddingId]);

  return (
    <MenuPageContent
      apiPaths={{ apiBase: `/api/planner/weddings/${weddingId}/tasting` }}
      isReadOnly={false}
      header={
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                <h1 className="text-2xl font-bold text-gray-900">🍽️ {t('title')}</h1>
                {weddingName && <p className="mt-0.5 text-sm text-gray-500">{weddingName}</p>}
              </div>
            </div>
          </div>
        </header>
      }
    />
  );
}
