/**
 * Wedding Planner - Wedding Detail Page
 *
 * Page for viewing a specific wedding's details and managing admins
 * Shows guest count, RSVP status, and wedding admin list
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { X, Calendar } from 'lucide-react';
import { AdminInviteForm } from '@/components/planner/AdminInviteForm';
import { ItineraryTimeline } from '@/components/shared/ItineraryTimeline';
import type { WeddingWithStats, ItineraryItem, Location } from '@/types/models';
import type { WeddingAdmin } from '@prisma/client';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface WeddingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function WeddingDetailPage({ params }: WeddingDetailPageProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [wedding, setWedding] = useState<(WeddingWithStats & {
    wedding_admins?: WeddingAdmin[];
    itinerary_items?: (ItineraryItem & { location: Location })[];
    main_event_location?: Location | null;
  }) | null>(null);
  const [admins, setAdmins] = useState<WeddingAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setWeddingId(id);
    });
  }, [params]);

  const fetchWeddingDetails = useCallback(async () => {
    if (!weddingId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/planner/weddings/${weddingId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError(t('planner.weddings.notFound'));
        } else {
          throw new Error('Failed to fetch wedding details');
        }
        return;
      }

      const data = await response.json();
      setWedding(data.data);

      // Fetch admins separately (if wedding has wedding_admins relation)
      if (data.data.wedding_admins) {
        setAdmins(data.data.wedding_admins);
      } else {
        setAdmins([]);
      }
    } catch (err) {
      setError(t('planner.weddings.loadError'));
      console.error('Error fetching wedding:', err);
    } finally {
      setLoading(false);
    }
  }, [weddingId, t]);

  useEffect(() => {
    if (weddingId) {
      fetchWeddingDetails();
    }
  }, [weddingId, fetchWeddingDetails]);

  const handleInviteAdmin = async (formData: { name: string; email: string }) => {
    console.log('[INVITE DEBUG] handleInviteAdmin called with:', formData);
    console.log('[INVITE DEBUG] weddingId:', weddingId);

    if (!weddingId) {
      console.error('[INVITE DEBUG] No weddingId, aborting');
      return;
    }

    try {
      console.log('[INVITE DEBUG] Making fetch request to:', `/api/planner/weddings/${weddingId}/admins`);
      const response = await fetch(`/api/planner/weddings/${weddingId}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('[INVITE DEBUG] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[INVITE DEBUG] Error response:', errorData);
        throw new Error(errorData.error?.message || t('planner.admins.inviteError'));
      }

      const data = await response.json();
      console.log('[INVITE DEBUG] Success response:', data);
      setAdmins([...admins, data.data]);
      setShowInviteForm(false);
    } catch (err) {
      console.error('[INVITE DEBUG] Error inviting admin:', err);
      throw err;
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!weddingId) return;

    if (!confirm(t('planner.admins.confirmRemove'))) {
      return;
    }

    try {
      const response = await fetch(`/api/planner/weddings/${weddingId}/admins?admin_id=${adminId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to remove admin');
      }

      setAdmins(admins.filter((admin) => admin.id !== adminId));
    } catch (err) {
      console.error('Error removing admin:', err);
      alert(t('common.errors.generic'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <WeddingSpinner size="md" />
          <p className="mt-2 text-sm text-gray-500">{t('planner.weddings.loadingDetails')}</p>
        </div>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">{error || t('planner.weddings.notFound')}</h2>
          <Link
            href="/planner/weddings"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            {t('planner.weddings.backToWeddings')}
          </Link>
        </div>
      </div>
    );
  }

  const weddingDate = new Date(wedding.wedding_date);
  const formattedDate = weddingDate.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    ARCHIVED: 'bg-gray-100 text-gray-600',
    COMPLETED: 'bg-blue-100 text-blue-700',
    DELETED: 'bg-red-100 text-red-700',
  };
  const statusColor = statusColors[wedding.status] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
            <Link href="/planner" className="hover:text-gray-600 transition-colors">{t('common.navigation.dashboard')}</Link>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <Link href="/planner/weddings" className="hover:text-gray-600 transition-colors">{t('planner.dashboard.myWeddings')}</Link>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-600 font-medium truncate">{wedding.couple_names}</span>
          </div>

          {/* Title + Edit */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{wedding.couple_names}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                  {t(`planner.weddings.statusLabels.${wedding.status}`)}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {formattedDate}{wedding.wedding_time && ` ${t('planner.weddings.at')} ${wedding.wedding_time}`}{wedding.location && ` \u00b7 ${wedding.location}`}
              </p>
            </div>
            <Link
              href={`/planner/weddings/${weddingId}/edit`}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('planner.weddings.edit')}
            </Link>
          </div>

          {/* Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div>
              <p className="text-2xl font-bold text-gray-900">{wedding.guest_count}</p>
              <p className="text-sm text-gray-500 mt-0.5">{t('planner.weddings.totalGuests')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{wedding.rsvp_completion_percentage}<span className="text-sm font-semibold text-gray-400">%</span></p>
              <p className="text-sm text-gray-500 mt-0.5">{t('planner.weddings.rsvpCompletion')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{wedding.attending_count}</p>
              <p className="text-sm text-gray-500 mt-0.5">{t('planner.weddings.attending')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{wedding.payment_received_count}</p>
              <p className="text-sm text-gray-500 mt-0.5">{t('planner.weddings.paymentsReceived')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Itinerary */}
        {wedding.itinerary_items && wedding.itinerary_items.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-400" />
                {t('planner.weddings.itinerary.title')}
              </h2>
              <Link
                href={`/planner/weddings/${weddingId}/edit`}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                {t('planner.weddings.edit')}
              </Link>
            </div>
            <ItineraryTimeline
              items={wedding.itinerary_items.map((item) => ({
                id: item.id,
                locationName: item.location.name,
                dateTime: item.date_time,
                itemType: item.item_type ?? 'EVENT',
                isMain: wedding.main_event_location_id === item.location_id,
                googleMapsUrl: item.location.google_maps_url,
                notes: item.notes,
              }))}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('planner.weddings.quickActions')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href={`/planner/weddings/${weddingId}/guests`}
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-indigo-200 hover:bg-indigo-50/20 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.guestList')}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{t('admin.dashboard.guestListSubtitle')}</p>
              </div>
              <svg className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/checklist`}
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-teal-200 hover:bg-teal-50/20 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                <svg className="h-6 w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{t('planner.checklist.title') || 'Wedding Checklist'}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{t('planner.checklist.description') || 'Manage tasks and track progress'}</p>
              </div>
              <svg className="h-4 w-4 text-gray-300 group-hover:text-teal-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/notifications`}
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-blue-200 hover:bg-blue-50/20 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.activity')}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{t('admin.dashboard.activitySubtitle')}</p>
              </div>
              <svg className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/seating`}
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-cyan-200 hover:bg-cyan-50/20 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                <svg className="h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.seatingPlan')}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{t('admin.dashboard.seatingPlanSubtitle')}</p>
              </div>
              <svg className="h-4 w-4 text-gray-300 group-hover:text-cyan-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/invitation-builder`}
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-amber-200 hover:bg-amber-50/20 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.dashboard.invitationBuilder')}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{t('admin.dashboard.invitationBuilderSubtitle')}</p>
              </div>
              <svg className="h-4 w-4 text-gray-300 group-hover:text-amber-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/providers`}
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-green-200 hover:bg-green-50/20 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{t('planner.providers.title') || 'Providers'}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{t('planner.providers.description') || 'Manage providers and payments'}</p>
              </div>
              <svg className="h-4 w-4 text-gray-300 group-hover:text-green-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/reports`}
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-purple-200 hover:bg-purple-50/20 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.reports.title')}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{t('admin.reports.subtitle')}</p>
              </div>
              <svg className="h-4 w-4 text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/templates`}
              className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-pink-200 hover:bg-pink-50/20 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                <svg className="h-6 w-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{t('admin.templates.title')}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{t('admin.templates.description')}</p>
              </div>
              <svg className="h-4 w-4 text-gray-300 group-hover:text-pink-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Info + Admins */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wedding Information */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">{t('planner.weddings.weddingInfo')}</h2>
            <div className="space-y-0">
              {[
                { label: t('planner.weddings.status'), value: t(`planner.weddings.statusLabels.${wedding.status}`) },
                { label: t('planner.weddings.defaultLanguage'), value: t(`common.languages.${wedding.default_language}`) },
                { label: t('planner.weddings.paymentMode'), value: wedding.payment_tracking_mode },
                {
                  label: t('planner.weddings.rsvpCutoff'),
                  value: new Date(wedding.rsvp_cutoff_date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }),
                },
                {
                  label: t('planner.weddings.guestAdditions'),
                  value: wedding.allow_guest_additions ? t('planner.weddings.allowed') : t('planner.weddings.notAllowed'),
                },
                ...(wedding.dress_code ? [{ label: t('planner.weddings.dressCode'), value: wedding.dress_code }] : []),
                ...(wedding.additional_info ? [{ label: t('planner.weddings.additionalInfo'), value: wedding.additional_info }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right ml-4">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Wedding Admins */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">{t('planner.weddings.weddingAdmins')}</h2>
              <button
                onClick={() => setShowInviteForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('planner.admins.invite')}
              </button>
            </div>

            {admins.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">{t('planner.weddings.noAdmins')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {admins.map((admin) => (
                  <li key={admin.id} className="py-3 flex items-center gap-3">
                    <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">{admin.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{admin.name}</p>
                      <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {admin.accepted_at ? (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">{t('planner.weddings.accepted')}</span>
                      ) : (
                        <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{t('planner.weddings.pending')}</span>
                      )}
                      <button
                        onClick={() => handleRemoveAdmin(admin.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        aria-label={t('planner.admins.remove')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      {/* Invite Admin Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('planner.weddings.inviteAdmin')}</h2>
            <AdminInviteForm
              onSubmit={handleInviteAdmin}
              onCancel={() => setShowInviteForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
