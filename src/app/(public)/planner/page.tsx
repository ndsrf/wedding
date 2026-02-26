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
import { UpcomingTasksWidget } from '@/components/planner/UpcomingTasksWidget';
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
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('planner.dashboard.title')}</h1>
              <p className="mt-0.5 text-sm text-gray-500">{t('planner.dashboard.subtitle')}</p>
            </div>
            <Link
              href="/planner/weddings?action=create"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('planner.dashboard.createWedding')}
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Stats Strip */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stats.wedding_count}</p>
                  <p className="text-sm text-gray-500 mt-1">{t('planner.stats.totalWeddings')}</p>
                </div>
                <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 h-1 rounded-full bg-rose-100">
                <div className="h-full w-full rounded-full bg-rose-400" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_guests.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">{t('planner.stats.totalGuests')}</p>
                </div>
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 h-1 rounded-full bg-blue-100">
                <div className="h-full w-full rounded-full bg-blue-400" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.rsvp_completion_percentage}<span className="text-lg font-semibold text-gray-400">%</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{t('planner.stats.rsvpCompletion')}</p>
                </div>
                <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 h-1 rounded-full bg-green-100">
                <div className="h-full rounded-full bg-green-400 transition-all duration-700" style={{ width: `${stats.rsvp_completion_percentage}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Weddings */}
        {stats && stats.upcoming_weddings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('planner.dashboard.upcomingWeddings')}</h2>
              <Link href="/planner/weddings" className="text-sm text-rose-600 hover:text-rose-700 font-medium">
                {t('planner.dashboard.allWeddings')} &rarr;
              </Link>
            </div>
            <div className="space-y-3">
              {stats.upcoming_weddings.map((wedding) => {
                const weddingDate = new Date(wedding.wedding_date);
                const today = new Date();
                const daysUntil = Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const month = weddingDate.toLocaleDateString('en', { month: 'short' });
                const day = weddingDate.getDate();
                return (
                  <Link
                    key={wedding.id}
                    href={`/planner/weddings/${wedding.id}`}
                    className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-rose-200 transition-all"
                  >
                    <div className="flex-shrink-0 w-14 h-16 bg-gradient-to-b from-rose-500 to-pink-600 text-white rounded-xl flex flex-col items-center justify-center shadow-md">
                      <span className="text-xs font-bold uppercase tracking-wide leading-none opacity-90">{month}</span>
                      <span className="text-2xl font-bold leading-none mt-0.5">{day}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-rose-600 transition-colors">
                        {wedding.couple_names}
                      </h3>
                      {wedding.location && (
                        <p className="text-sm text-gray-500 truncate mt-0.5">{wedding.location}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {daysUntil > 1 ? `${daysUntil} days away` : daysUntil === 1 ? 'Tomorrow' : 'Today'}
                      </p>
                    </div>
                    <svg className="h-5 w-5 text-gray-300 group-hover:text-rose-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Tasks Widget */}
        <div>
          <UpcomingTasksWidget />
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('planner.dashboard.quickActions')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Link
              href="/planner/weddings"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-purple-200 hover:bg-purple-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('planner.dashboard.allWeddings')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('planner.dashboard.allWeddingsSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/planner/weddings?action=create"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-rose-200 hover:bg-rose-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('planner.dashboard.createWedding')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('planner.dashboard.createWeddingSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/planner/checklist-template"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-green-200 hover:bg-green-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('planner.dashboard.checklistTemplate')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('planner.dashboard.checklistTemplateSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/planner/providers"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-orange-200 hover:bg-orange-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('planner.dashboard.providers')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('planner.dashboard.providersSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/planner/templates"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-pink-200 hover:bg-pink-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                <svg className="h-6 w-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('planner.dashboard.templates')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('planner.dashboard.templatesSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/planner/locations"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-cyan-200 hover:bg-cyan-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                <svg className="h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Locations</h3>
                <p className="text-xs text-gray-500 mt-0.5">Manage ceremony venues and event locations</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {stats && stats.wedding_count === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900">{t('planner.dashboard.noWeddings')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('planner.dashboard.noWeddingsSubtitle')}</p>
            <div className="mt-6">
              <Link
                href="/planner/weddings?action=create"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('planner.dashboard.createWedding')}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
