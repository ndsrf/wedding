/**
 * Wedding Admin - Reports Page
 *
 * Page for generating and downloading various wedding reports
 */

import Link from 'next/link';
import { getTranslations } from '@/lib/i18n/server';
import { ReportsView } from '@/components/admin/ReportsView';

export default async function ReportsPage() {
  const { t } = await getTranslations();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin"
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
        <ReportsView />
      </main>
    </div>
  );
}
