/**
 * Wedding Planner - Reports Page
 *
 * Page for generating and downloading various wedding reports for a specific wedding
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ReportsView } from '@/components/admin/ReportsView';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface ReportsPageProps {
  params: Promise<{ id: string }>;
}

export default function ReportsPage({ params }: ReportsPageProps) {
  const t = useTranslations();
  const [weddingId, setWeddingId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setWeddingId(id);
    });
  }, [params]);

  if (!weddingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <WeddingSpinner size="md" />
          <p className="mt-2 text-sm text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/planner/weddings/${weddingId}`}
                className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
              >
                ← {t('common.buttons.back')}
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('admin.reports.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {t('admin.reports.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReportsView apiBasePath={`/api/planner/weddings/${weddingId}/reports`} />
      </main>
    </div>
  );
}
