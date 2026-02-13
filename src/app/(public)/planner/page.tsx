/**
 * Wedding Planner Dashboard Page
 *
 * Main dashboard for wedding planners showing statistics and wedding list
 * Displays wedding count, total guests, RSVP completion, and upcoming weddings
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from '@/lib/i18n/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { StatsCard } from '@/components/planner/StatsCard';
import { WeddingCard } from '@/components/planner/WeddingCard';
import { UpcomingTasksWidget } from '@/components/planner/UpcomingTasksWidget';
import PrivateHeader from '@/components/PrivateHeader';
import type { PlannerStats } from '@/types/api';
import type { AuthenticatedUser } from '@/types/api';

/**
 * Get planner statistics directly from database
 */
async function getStats(user: AuthenticatedUser): Promise<PlannerStats | null> {
  try {
    if (!user.planner_id) {
      return null;
    }

    // Get total wedding count
    const wedding_count = await prisma.wedding.count({
      where: { planner_id: user.planner_id },
    });

    // Get all weddings for the planner
    const weddings = await prisma.wedding.findMany({
      where: { planner_id: user.planner_id },
      include: {
        families: {
          include: {
            members: true,
          },
        },
      },
    });

    // Calculate total guests across all weddings
    const total_guests = weddings.reduce(
      (sum, wedding) =>
        sum + wedding.families.reduce((familySum, family) => familySum + family.members.length, 0),
      0
    );

    // Calculate RSVP completion percentage
    let totalFamilies = 0;
    let familiesWithRSVP = 0;

    weddings.forEach((wedding) => {
      totalFamilies += wedding.families.length;
      familiesWithRSVP += wedding.families.filter((family) =>
        family.members.some((member) => member.attending !== null)
      ).length;
    });

    const rsvp_completion_percentage =
      totalFamilies > 0 ? Math.round((familiesWithRSVP / totalFamilies) * 100) : 0;

    // Get upcoming weddings (future weddings, sorted by date)
    const today = new Date();
    const upcoming_weddings = await prisma.wedding.findMany({
      where: {
        planner_id: user.planner_id,
        wedding_date: {
          gte: today,
        },
        status: 'ACTIVE',
      },
      orderBy: {
        wedding_date: 'asc',
      },
      take: 5,
    });

    return {
      wedding_count,
      total_guests,
      rsvp_completion_percentage,
      upcoming_weddings,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

export default async function PlannerDashboardPage() {
  // Check authentication - redirect if not planner
  let user;
  try {
    user = await requireRole('planner');
  } catch {
    redirect('/api/auth/signin');
  }

  const { t } = await getTranslations();
  // Fetch stats data directly from database
  const stats = await getStats(user);

  return (
    <div className="min-h-screen">
      <PrivateHeader
        title={t('planner.dashboard.title')}
        subtitle={t('planner.dashboard.subtitle')}
        hideBackButton={true}
        additionalContent={
          <Link
            href="/planner/weddings?action=create"
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg hover:from-rose-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg"
          >
            {t('planner.dashboard.createWedding')}
          </Link>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <StatsCard
              title={t('planner.stats.totalWeddings')}
              value={stats.wedding_count}
              colorClass="bg-purple-50 border-purple-200"
            />
            <StatsCard
              title={t('planner.stats.totalGuests')}
              value={stats.total_guests}
              colorClass="bg-blue-50 border-blue-200"
            />
            <StatsCard
              title={t('planner.stats.rsvpCompletion')}
              value={stats.rsvp_completion_percentage}
              suffix="%"
              colorClass="bg-green-50 border-green-200"
            />
          </div>
        )}

        {/* Upcoming Weddings */}
        {stats && stats.upcoming_weddings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('planner.dashboard.upcomingWeddings')}</h2>
            <div className="grid grid-cols-1 gap-6">
              {stats.upcoming_weddings.map((wedding) => (
                <WeddingCard
                  key={wedding.id}
                  wedding={{
                    ...wedding,
                    guest_count: 0,
                    rsvp_count: 0,
                    rsvp_completion_percentage: 0,
                    attending_count: 0,
                    payment_received_count: 0,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Tasks Widget */}
        <div className="mb-8">
          <UpcomingTasksWidget />
        </div>

        {/* Quick Links */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('planner.dashboard.quickActions')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/planner/weddings"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-purple-600"
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
                <h3 className="text-sm font-medium text-gray-900">{t('planner.dashboard.allWeddings')}</h3>
                <p className="mt-1 text-sm text-gray-600">{t('planner.dashboard.allWeddingsSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/planner/weddings?action=create"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('planner.dashboard.createWedding')}</h3>
                <p className="mt-1 text-sm text-gray-600">{t('planner.dashboard.createWeddingSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/planner/checklist-template"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('planner.dashboard.checklistTemplate')}</h3>
                <p className="mt-1 text-sm text-gray-600">{t('planner.dashboard.checklistTemplateSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/planner/providers"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-orange-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('planner.dashboard.providers')}</h3>
                <p className="mt-1 text-sm text-gray-600">{t('planner.dashboard.providersSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/planner/templates"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-rose-300 hover:bg-rose-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-rose-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('planner.dashboard.templates')}</h3>
                <p className="mt-1 text-sm text-gray-600">{t('planner.dashboard.templatesSubtitle')}</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {stats && stats.wedding_count === 0 && (
          <div className="bg-white shadow rounded-lg p-12 text-center mt-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('planner.dashboard.noWeddings')}</h3>
            <p className="mt-1 text-sm text-gray-600">{t('planner.dashboard.noWeddingsSubtitle')}</p>
            <div className="mt-6">
              <Link
                href="/planner/weddings?action=create"
                className="inline-flex items-center px-4 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('planner.dashboard.createWedding')}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
