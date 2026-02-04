/**
 * Wedding Admin Dashboard Page
 *
 * Main dashboard for wedding admins showing key metrics and quick actions
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { formatDateByLanguage } from '@/lib/date-formatter';
import { isValidLanguage } from '@/lib/i18n/config';
import { StatsCard } from '@/components/planner/StatsCard';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UpcomingTasksWidget } from '@/components/admin/UpcomingTasksWidget';
import type { AuthenticatedUser } from '@/types/api';

interface WeddingStats {
  couple_names: string;
  wedding_date: Date;
  location: string;
  guest_count: number;
  rsvp_count: number;
  rsvp_completion_percentage: number;
  attending_count: number;
  payment_received_count: number;
  days_until_wedding: number;
}

async function getWeddingStats(user: AuthenticatedUser): Promise<WeddingStats | null> {
  try {
    if (!user.wedding_id) {
      return null;
    }

    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      include: {
        families: {
          include: {
            members: true,
            gifts: true,
          },
        },
      },
    });

    if (!wedding) {
      return null;
    }

    const totalGuests = wedding.families.reduce(
      (sum, family) => sum + family.members.length,
      0
    );

    const rsvpSubmittedFamilies = wedding.families.filter((family) =>
      family.members.some((member) => member.attending !== null)
    );

    const rsvpCount = rsvpSubmittedFamilies.length;
    const rsvpCompletionPercentage =
      wedding.families.length > 0
        ? Math.round((rsvpCount / wedding.families.length) * 100)
        : 0;

    const attendingCount = wedding.families.reduce(
      (sum, family) =>
        sum + family.members.filter((m) => m.attending === true).length,
      0
    );

    const paymentReceivedCount = wedding.families.filter((family) =>
      family.gifts.some(
        (gift) => gift.status === 'RECEIVED' || gift.status === 'CONFIRMED'
      )
    ).length;

    const today = new Date();
    const weddingDate = new Date(wedding.wedding_date);
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      couple_names: wedding.couple_names,
      wedding_date: wedding.wedding_date,
      location: wedding.location,
      guest_count: totalGuests,
      rsvp_count: rsvpCount,
      rsvp_completion_percentage: rsvpCompletionPercentage,
      attending_count: attendingCount,
      payment_received_count: paymentReceivedCount,
      days_until_wedding: daysUntilWedding,
    };
  } catch (error) {
    console.error('Error fetching wedding stats:', error);
    return null;
  }
}

export default async function AdminDashboardPage() {
  let user;
  try {
    user = await requireRole('wedding_admin');
  } catch {
    redirect('/api/auth/signin');
  }

  const t = await getTranslations();
  const stats = await getWeddingStats(user);

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">{t('admin.dashboard.weddingNotFound')}</h1>
          <p className="mt-2 text-gray-500">{t('admin.dashboard.contactPlanner')}</p>
        </div>
      </div>
    );
  }

  const locale = await getLocale();
  const language = isValidLanguage(locale) ? locale : 'en';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{stats.couple_names}</h1>
              <p className="mt-1 text-sm text-gray-600">
                {formatDateByLanguage(stats.wedding_date, language)} • {stats.location}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-3">
              <LanguageSwitcher />
              <Link
                href="/api/auth/signout"
                className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-center sm:text-left"
              >
                {t('common.navigation.logout')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Days Countdown */}
        {stats.days_until_wedding > 0 && (
          <div className="bg-purple-600 text-white rounded-lg p-6 mb-8 text-center">
            <p className="text-4xl font-bold">{stats.days_until_wedding}</p>
            <p className="text-purple-200 mt-1">{t('admin.dashboard.daysUntilWedding')}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title={t('admin.dashboard.metricTitles.totalGuests')}
            value={stats.guest_count}
            colorClass="bg-blue-50 border-blue-200"
          />
          <StatsCard
            title={t('admin.dashboard.metricTitles.rsvpCompletion')}
            value={stats.rsvp_completion_percentage}
            suffix="%"
            colorClass="bg-green-50 border-green-200"
          />
          <StatsCard
            title={t('admin.dashboard.metricTitles.attending')}
            value={stats.attending_count}
            colorClass="bg-purple-50 border-purple-200"
          />
          <StatsCard
            title={t('admin.dashboard.metricTitles.paymentsReceived')}
            value={stats.payment_received_count}
            colorClass="bg-yellow-50 border-yellow-200"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('admin.dashboard.manageWedding')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Link
              href="/admin/guests"
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('admin.dashboard.guestList')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('admin.dashboard.guestListSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/checklist"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-teal-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('admin.dashboard.checklist')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('admin.dashboard.checklistSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/notifications"
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
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('admin.dashboard.activity')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('admin.dashboard.activitySubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/payments"
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('admin.dashboard.payments')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('admin.dashboard.paymentsSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/guests?action=import"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('admin.dashboard.importGuests')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('admin.dashboard.importGuestsSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/configure"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('admin.dashboard.configure')}</h3>
                <p className="mt-1 text-sm text-gray-600">{t('admin.dashboard.configureSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/templates"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-pink-300 hover:bg-pink-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-pink-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('admin.dashboard.templates')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('admin.dashboard.templatesSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/invitation-builder"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('admin.dashboard.invitationBuilder')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('admin.dashboard.invitationBuilderSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/seating"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-cyan-300 hover:bg-cyan-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-cyan-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('admin.dashboard.seatingPlan')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('admin.dashboard.seatingPlanSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/providers"
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
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{t('admin.dashboard.providers')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('admin.dashboard.providersSubtitle')}</p>
              </div>
            </Link>
          </div>
        </div>

        {/* RSVP Progress */}
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('admin.dashboard.rsvpProgress')}</h2>
          <div className="relative pt-1">
            <div className="overflow-hidden h-4 text-xs flex rounded-full bg-gray-200">
              <div
                style={{ width: `${stats.rsvp_completion_percentage}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-600 transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>{stats.rsvp_count} {t('admin.dashboard.responded')}</span>
              <span>{stats.rsvp_completion_percentage}% {t('admin.dashboard.complete')}</span>
            </div>
          </div>
        </div>

        {/* Upcoming Tasks Widget */}
        {user.wedding_id && (
          <div className="mt-8">
            <UpcomingTasksWidget />
          </div>
        )}
      </main>
    </div>
  );
}
