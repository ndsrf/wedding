'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ProviderLibrary } from '@/components/planner/providers/ProviderLibrary';

export default function ProvidersPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <Link href="/planner" className="text-gray-500 hover:text-gray-700 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('planner.providers.title') || 'Provider Management'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <ProviderLibrary />
        </div>
      </main>
    </div>
  );
}