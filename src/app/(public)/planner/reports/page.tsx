/**
 * Wedding Planner — Cross-Wedding Reports Page
 *
 * Provides reports and analytics across ALL weddings managed by this planner,
 * plus the planner's own financials (quotes, invoices, provider payments).
 *
 * This is distinct from the per-wedding reports page at
 * /planner/weddings/[id]/reports which shows data for a single wedding.
 */

import Link from 'next/link';
import PrivateHeader from '@/components/PrivateHeader';
import { getTranslations } from '@/lib/i18n/server';
import { requireRole } from '@/lib/auth/middleware';
import { PlannerReportsView } from '@/components/planner/PlannerReportsView';

export async function generateMetadata() {
  const { t } = await getTranslations();
  return { title: `Nupci – ${t('planner.reports.title')}` };
}

export default async function PlannerReportsPage() {
  await requireRole('planner');
  const { t } = await getTranslations();

  return (
    <div className="min-h-screen bg-gray-50">
      <PrivateHeader
        backUrl="/planner"
        title={t('planner.reports.title')}
        subtitle={t('planner.reports.subtitle')}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb info banner */}
        <div className="mb-6 flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="shrink-0 mt-0.5">
            <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-900">{t('planner.reports.scopeNote')}</p>
            <p className="mt-0.5 text-sm text-indigo-700">
              {t('planner.reports.perWeddingNote')}{' '}
              <Link href="/planner/weddings" className="underline hover:text-indigo-900 font-medium">
                {t('planner.reports.goToWeddings')}
              </Link>
            </p>
          </div>
        </div>

        <PlannerReportsView />
      </main>
    </div>
  );
}
