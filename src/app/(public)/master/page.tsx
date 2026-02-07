/**
 * Master Admin Dashboard Page
 *
 * Main dashboard for master admin showing platform analytics
 * Displays total planners, active planners, total weddings, and total guests
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from '@/lib/i18n/server';
import { requireRole } from '@/lib/auth/middleware';
import { AnalyticsCard } from '@/components/master/AnalyticsCard';
import { prisma } from '@/lib/db/prisma';
import type { MasterAnalytics } from '@/types/api';

/**
 * Fetch platform analytics directly from database
 * Server Components can access the database directly without going through API routes
 */
async function getAnalytics(): Promise<MasterAnalytics> {
  const [totalPlanners, activePlanners, totalWeddings, totalGuests] = await Promise.all([
    prisma.weddingPlanner.count(),
    prisma.weddingPlanner.count({ where: { enabled: true } }),
    prisma.wedding.count(),
    prisma.family.count(),
  ]);

  return {
    total_planners: totalPlanners,
    active_planners: activePlanners,
    total_weddings: totalWeddings,
    total_guests: totalGuests,
  };
}

export default async function MasterDashboardPage() {
  // Check authentication - redirect if not master admin
  try {
    await requireRole('master_admin');
  } catch {
    redirect('/api/auth/signin');
  }

  const { t } = await getTranslations();

  // Fetch analytics data
  let analytics: MasterAnalytics | null = null;
  let error: string | null = null;

  try {
    analytics = await getAnalytics();
  } catch (e) {
    error = t('common.errors.generic');
    console.error('Error loading analytics:', e);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {t('master.dashboard.title')}
              </h1>
              <p className="mt-2 text-base text-gray-600">{t('master.dashboard.overview')}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/auth/signout"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm"
            >
              {t('common.navigation.logout')}
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 text-base">
            {error}
          </div>
        )}

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <AnalyticsCard
              title={t('master.analytics.totalPlanners')}
              value={analytics.total_planners}
              colorClass="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300"
            />
            <AnalyticsCard
              title={t('master.analytics.activePlanners')}
              value={analytics.active_planners}
              colorClass="bg-gradient-to-br from-green-50 to-emerald-100 border-green-300"
            />
            <AnalyticsCard
              title={t('master.analytics.totalWeddings')}
              value={analytics.total_weddings}
              colorClass="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300"
            />
            <AnalyticsCard
              title={t('master.analytics.totalGuests')}
              value={analytics.total_guests}
              colorClass="bg-gradient-to-br from-pink-50 to-rose-100 border-pink-300"
            />
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8 border border-pink-100">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">{t('master.dashboard.quickActions')}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Link
              href="/master/planners"
              className="flex items-center p-6 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all hover:shadow-md group"
            >
              <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('master.planners.title')}</h3>
                <p className="mt-1 text-base text-gray-600">
                  {t('master.planners.description')}
                </p>
              </div>
            </Link>

            <Link
              href="/master/weddings"
              className="flex items-center p-6 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50/50 transition-all hover:shadow-md group"
            >
              <div className="flex-shrink-0 p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <svg
                  className="h-5 w-5 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('master.weddings.title')}</h3>
                <p className="mt-1 text-base text-gray-600">
                  {t('master.weddings.description')}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}