/**
 * Wedding Admin Dashboard Page
 *
 * Main dashboard for wedding admins showing key metrics and quick actions
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations, getLanguageFromRequest } from '@/lib/i18n/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { formatDateByLanguage } from '@/lib/date-formatter';
import { UpcomingTasksWidget } from '@/components/admin/UpcomingTasksWidget';
import { ItineraryTimeline } from '@/components/shared/ItineraryTimeline';
import { WizardButton } from '@/components/admin/WizardButton';
import type { AuthenticatedUser } from '@/types/api';

interface ItinerarySummaryItem {
  location_name: string;
  item_type: string;
  address: string | null;
  google_maps_url: string | null;
  date_time: Date;
  notes: string | null;
  is_main: boolean;
}

interface WeddingStats {
  couple_names: string;
  wedding_date: Date;
  location: string | null;
  main_event_location: { name: string; address: string | null; google_maps_url: string | null } | null;
  itinerary: ItinerarySummaryItem[];
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
        main_event_location: true,
        itinerary_items: {
          include: { location: true },
          orderBy: { date_time: 'asc' },
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
      main_event_location: wedding.main_event_location
        ? {
            name: wedding.main_event_location.name,
            address: wedding.main_event_location.address,
            google_maps_url: wedding.main_event_location.google_maps_url,
          }
        : null,
      itinerary: wedding.itinerary_items.map((item) => ({
        location_name: item.location.name,
        item_type: item.item_type,
        address: item.location.address,
        google_maps_url: item.location.google_maps_url,
        date_time: item.date_time,
        notes: item.notes,
        is_main: item.location_id === wedding.main_event_location_id,
      })),
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

  // Check if wizard should be shown
  if (user.wedding_id) {
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: {
        wizard_completed: true,
        wizard_skipped: true,
      },
    });

    // Redirect to wizard if not completed and not skipped
    if (wedding && !wedding.wizard_completed && !wedding.wizard_skipped) {
      redirect('/admin/wizard');
    }
  }

  const { t } = await getTranslations();
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

  const language = await getLanguageFromRequest();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white shadow-sm border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                {stats.couple_names}
              </h1>
              <p className="mt-2 text-gray-500 text-sm">
                {formatDateByLanguage(stats.wedding_date, language)}
                {stats.location && <>{' \u00b7 '}{stats.location}</>}
              </p>
            </div>
            {stats.days_until_wedding > 0 && (
              <div className="flex-shrink-0 text-center bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-2xl px-8 py-5 shadow-lg shadow-rose-200">
                <p className="text-5xl font-bold leading-none">{stats.days_until_wedding}</p>
                <p className="text-rose-100 text-sm mt-1.5 font-medium">{t('admin.dashboard.daysUntilWedding')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Itinerary Timeline */}
      {stats.itinerary.length > 0 && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <ItineraryTimeline
              items={stats.itinerary.map((item, idx) => ({
                id: idx,
                locationName: item.location_name,
                dateTime: item.date_time.toISOString(),
                itemType: item.item_type,
                isMain: item.is_main,
                googleMapsUrl: item.google_maps_url,
                notes: item.notes,
              }))}
            />
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.guest_count.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{t('admin.dashboard.metricTitles.totalGuests')}</p>
              </div>
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3 h-1 rounded-full bg-blue-100">
              <div className="h-full w-full rounded-full bg-blue-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stats.rsvp_completion_percentage}<span className="text-base font-semibold text-gray-400">%</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">{t('admin.dashboard.metricTitles.rsvpCompletion')}</p>
              </div>
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3 h-1 rounded-full bg-green-100">
              <div className="h-full rounded-full bg-green-400 transition-all duration-700" style={{ width: `${stats.rsvp_completion_percentage}%` }} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.attending_count.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{t('admin.dashboard.metricTitles.attending')}</p>
              </div>
              <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3 h-1 rounded-full bg-rose-100">
              <div className="h-full w-full rounded-full bg-rose-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.payment_received_count.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{t('admin.dashboard.metricTitles.paymentsReceived')}</p>
              </div>
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3 h-1 rounded-full bg-amber-100">
              <div className="h-full w-full rounded-full bg-amber-400" />
            </div>
          </div>
        </div>

        {/* RSVP Progress */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">{t('admin.dashboard.rsvpProgress')}</h2>
            <span className="text-sm font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
              {stats.rsvp_completion_percentage}% {t('admin.dashboard.complete')}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              style={{ width: `${stats.rsvp_completion_percentage}%` }}
              className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-700"
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>{stats.rsvp_count} {t('admin.dashboard.responded')}</span>
            <span>{stats.guest_count} {t('admin.dashboard.metricTitles.totalGuests')}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.dashboard.manageWedding')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <WizardButton />

            <Link
              href="/admin/guests"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-purple-200 hover:bg-purple-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.guestList')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('admin.dashboard.guestListSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/checklist"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-teal-200 hover:bg-teal-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                <svg className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.checklist')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('admin.dashboard.checklistSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/notifications"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-blue-200 hover:bg-blue-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.activity')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('admin.dashboard.activitySubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/payments"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-green-200 hover:bg-green-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.payments')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('admin.dashboard.paymentsSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/guests?action=import"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-orange-200 hover:bg-orange-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.importGuests')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('admin.dashboard.importGuestsSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/configure"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.configure')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('admin.dashboard.configureSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/templates"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-pink-200 hover:bg-pink-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                <svg className="h-6 w-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.templates')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('admin.dashboard.templatesSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/invitation-builder"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-amber-200 hover:bg-amber-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.invitationBuilder')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('admin.dashboard.invitationBuilderSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/seating"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-cyan-200 hover:bg-cyan-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                <svg className="h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.seatingPlan')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('admin.dashboard.seatingPlanSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/providers"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-rose-200 hover:bg-rose-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.providers')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('admin.dashboard.providersSubtitle')}</p>
              </div>
            </Link>

            <Link
              href="/admin/reports"
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-emerald-200 hover:bg-emerald-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.reports')}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t('admin.dashboard.reportsSubtitle')}</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Upcoming Tasks Widget */}
        {user.wedding_id && (
          <UpcomingTasksWidget />
        )}
      </main>
    </div>
  );
}
