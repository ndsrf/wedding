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
import NotificationBell from '@/components/admin/NotificationBell';
import PrivateHeader from '@/components/PrivateHeader';
import { NavGroup } from '@/components/shared/NavGroup';
import { getCached, setCached, CACHE_KEYS, CACHE_TTL } from '@/lib/cache/redis';
import {
  UsersIcon,
  ChevronRightIcon,
  ChecklistIcon,
  ClipboardIcon,
  BuildingIcon,
  EnvelopeIcon,
  PencilEditIcon,
  DocumentTextIcon,
  CurrencyIcon,
  SeatingIcon,
} from '@/components/shared/NavIcons';
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
  itinerary: ItinerarySummaryItem[];
  guest_count: number;
  rsvp_count: number;
  rsvp_completion_percentage: number;
  attending_count: number;
  payment_received_count: number;
  days_until_wedding: number;
}

interface AdminPageData {
  wizardCompleted: boolean;
  wizardSkipped: boolean;
  stats: WeddingStats;
}

// Single function fetches all data needed by the admin page in one round-trip,
// replacing the separate wizard-check query and the stats queries.
// Results are cached in Redis (TTL = WEDDING_STATS = 5 min) and invalidated
// on every guest/wedding mutation, so the DB is only hit on cache misses.
async function getAdminPageData(user: AuthenticatedUser): Promise<AdminPageData | null> {
  try {
    if (!user.wedding_id) {
      return null;
    }

    // Check Redis cache first — avoids all 5 stat queries on repeated loads
    const cacheKey = CACHE_KEYS.adminDashboard(user.wedding_id);
    const cached = await getCached<AdminPageData>(cacheKey);
    if (cached) {
      // Dates are serialised as ISO strings in Redis; rehydrate them
      return {
        ...cached,
        stats: {
          ...cached.stats,
          wedding_date: new Date(cached.stats.wedding_date),
          itinerary: cached.stats.itinerary.map((item) => ({
            ...item,
            date_time: new Date(item.date_time),
          })),
        },
      };
    }

    // main_event_location is intentionally NOT included here.
    // The main_event_location_id FK is available on the wedding record itself and is
    // used only to compute is_main on each itinerary item. The location data we need
    // (name, address, google_maps_url) is already fetched via itinerary_items → location,
    // so there is no need for an extra SELECT … FROM locations WHERE id = $1 query.
    const [wedding, totalGuests, totalFamilies, rsvpCount, attendingCount, paymentReceivedRows] =
      await Promise.all([
        prisma.wedding.findUnique({
          where: { id: user.wedding_id },
          include: {
            itinerary_items: {
              include: { location: true },
              orderBy: { date_time: 'asc' },
            },
          },
        }),
        prisma.familyMember.count({ where: { family: { wedding_id: user.wedding_id } } }),
        prisma.family.count({ where: { wedding_id: user.wedding_id } }),
        prisma.family.count({
          where: {
            wedding_id: user.wedding_id,
            members: { some: { attending: { not: null } } },
          },
        }),
        prisma.familyMember.count({
          where: { family: { wedding_id: user.wedding_id }, attending: true },
        }),
        // COUNT(DISTINCT family_id) in one aggregate — uses the covering index
        // (wedding_id, status, family_id) for an index-only scan. Much cheaper
        // than findMany+distinct which streams every matching row to Node.
        prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(DISTINCT family_id) AS count
          FROM gifts
          WHERE wedding_id = ${user.wedding_id}
            AND status = ANY(ARRAY['RECEIVED','CONFIRMED']::"GiftStatus"[])
        `,
      ]);

    if (!wedding) {
      return null;
    }

    const paymentReceivedCount = Number(paymentReceivedRows[0]?.count ?? 0);
    const rsvpCompletionPercentage =
      totalFamilies > 0 ? Math.round((rsvpCount / totalFamilies) * 100) : 0;

    const today = new Date();
    const weddingDate = new Date(wedding.wedding_date);
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const pageData: AdminPageData = {
      wizardCompleted: wedding.wizard_completed,
      wizardSkipped: wedding.wizard_skipped,
      stats: {
        couple_names: wedding.couple_names,
        wedding_date: wedding.wedding_date,
        location: wedding.location,
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
      },
    };

    // Populate cache so subsequent requests skip the DB entirely
    await setCached(cacheKey, pageData, CACHE_TTL.WEDDING_STATS);

    return pageData;
  } catch (error) {
    console.error('Error fetching admin page data:', error);
    return null;
  }
}

export async function generateMetadata() {
  try {
    const [{ t }, user] = await Promise.all([
      getTranslations(),
      requireRole('wedding_admin').catch(() => null),
    ]);
    if (!user?.wedding_id) return { title: `Nupci - ${t('admin.dashboard.title')}` };
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { couple_names: true },
    });
    const coupleNames = wedding?.couple_names;
    return {
      title: coupleNames ? `Nupci - ${coupleNames}` : `Nupci - ${t('admin.dashboard.title')}`,
    };
  } catch {
    return { title: 'Nupci' };
  }
}

export default async function AdminDashboardPage() {
  let user;
  try {
    user = await requireRole('wedding_admin');
  } catch {
    redirect('/api/auth/signin');
  }

  // Single query replaces both the wizard-check query and the stats queries.
  const [{ t }, pageData] = await Promise.all([
    getTranslations(),
    getAdminPageData(user),
  ]);

  // Redirect to wizard if not completed and not skipped
  if (pageData && !pageData.wizardCompleted && !pageData.wizardSkipped) {
    redirect('/admin/wizard');
  }

  const stats = pageData?.stats ?? null;

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
    <div className="min-h-screen">
      {/* Top Header: Logo, Language, Sign-out, Notifications */}
      <PrivateHeader
        hideBackButton
        additionalContent={<NotificationBell />}
      />

      {/* Wedding Hero */}
      <div className="bg-white shadow-sm border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 leading-tight font-playfair">
                {stats.couple_names}
              </h1>
              <p className="mt-1 sm:mt-2 text-gray-500 text-xs sm:text-sm">
                {formatDateByLanguage(stats.wedding_date, language)}
                {stats.location && <>{' \u00b7 '}{stats.location}</>}
              </p>
            </div>
            {stats.days_until_wedding > 0 && (
              <div className="flex-shrink-0 text-center bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-xl sm:rounded-2xl px-4 py-3 sm:px-8 sm:py-5 shadow-lg shadow-rose-200">
                <p className="text-3xl sm:text-5xl font-bold leading-none">{stats.days_until_wedding}</p>
                <p className="text-rose-100 text-xs sm:text-sm mt-1 sm:mt-1.5 font-medium">{t('admin.dashboard.daysUntilWedding')}</p>
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
                <UsersIcon className="h-5 w-5 text-blue-500" />
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
                <CurrencyIcon className="h-5 w-5 text-amber-500" />
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

        {/* Upcoming Tasks Widget — shown above main actions */}
        {user.wedding_id && (
          <UpcomingTasksWidget />
        )}

        {/* Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.dashboard.manageWedding')}</h2>

          {/* Primary Actions: Guest Management + Configure Wedding */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Guest Management - most important, featured */}
            <Link
              href="/admin/guests"
              prefetch={false}
              className="group flex items-center gap-5 bg-white rounded-2xl border-2 border-purple-100 shadow-sm p-6 hover:shadow-md hover:border-purple-300 hover:bg-purple-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-md shadow-purple-200 group-hover:shadow-purple-300 transition-shadow">
                <UsersIcon className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">{t('admin.dashboard.guestList')}</h3>
                  <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                    {stats.guest_count}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{t('admin.dashboard.guestListSubtitle')}</p>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
            </Link>

            {/* Configure Wedding - prominent */}
            <Link
              href="/admin/configure"
              prefetch={false}
              className="group flex items-center gap-5 bg-white rounded-2xl border-2 border-indigo-100 shadow-sm p-6 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
            >
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200 group-hover:shadow-indigo-300 transition-shadow">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900">{t('admin.dashboard.configure')}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{t('admin.dashboard.configureSubtitle')}</p>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
            </Link>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tareas y Finanzas — grouped */}
            <NavGroup
              title={t('admin.dashboard.tasksAndFinances')}
              headerBgClass="bg-teal-50"
              hoverTextClass="hover:text-teal-600"
              headerIcon={<ChecklistIcon className="h-5 w-5 text-teal-600" />}
              items={[
                {
                  href: '/admin/checklist',
                  label: t('admin.dashboard.checklist'),
                  icon: <ChecklistIcon className="h-3 w-3" />,
                },
                {
                  href: '/admin/providers',
                  label: t('admin.dashboard.expenses'),
                  icon: <BuildingIcon className="h-3 w-3" />,
                },
                {
                  href: '/admin/payments',
                  label: t('admin.dashboard.payments'),
                  icon: <CurrencyIcon className="h-3 w-3" />,
                },
              ]}
            />

            {/* Invitations & Templates — grouped */}
            <NavGroup
              title={t('admin.dashboard.invitationsAndTemplates')}
              headerBgClass="bg-pink-50"
              hoverTextClass="hover:text-pink-600"
              headerIcon={<EnvelopeIcon className="h-5 w-5 text-pink-600" />}
              items={[
                {
                  href: '/admin/invitation-builder',
                  label: t('admin.dashboard.invitationBuilder'),
                  icon: <PencilEditIcon className="h-3 w-3" />,
                },
                {
                  href: '/admin/templates',
                  label: t('admin.dashboard.templates'),
                  icon: <DocumentTextIcon className="h-3 w-3" />,
                },
              ]}
            />

            {/* Food & Drinks — grouped */}
            <NavGroup
              title={t('admin.tastingMenu.nav')}
              headerBgClass="bg-rose-50"
              hoverTextClass="hover:text-rose-600"
              headerIcon={<span className="text-xl">🍽️</span>}
              items={[
                {
                  href: '/admin/tasting',
                  label: t('admin.tastingMenu.tasting'),
                  icon: <ClipboardIcon className="h-3 w-3" />,
                },
                {
                  href: '/admin/menu',
                  label: t('admin.tastingMenu.weddingMenu'),
                  icon: <ClipboardIcon className="h-3 w-3" />,
                },
                {
                  href: '/admin/seating',
                  label: t('admin.dashboard.seatingPlan'),
                  icon: <SeatingIcon className="h-3 w-3" />,
                },
              ]}
            />
          </div>
        </div>
      </main>

    </div>
  );
}
