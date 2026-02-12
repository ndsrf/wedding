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
import { X } from 'lucide-react';
import { AdminInviteForm } from '@/components/planner/AdminInviteForm';
import type { WeddingWithStats } from '@/types/models';
import type { WeddingAdmin } from '@prisma/client';

interface WeddingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function WeddingDetailPage({ params }: WeddingDetailPageProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [wedding, setWedding] = useState<(WeddingWithStats & { wedding_admins?: WeddingAdmin[] }) | null>(null);
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                <Link href="/planner" className="hover:text-gray-700">
                  {t('common.navigation.dashboard')}
                </Link>
                <span>/</span>
                <Link href="/planner/weddings" className="hover:text-gray-700">
                  {t('planner.dashboard.myWeddings')}
                </Link>
                <span>/</span>
                <span>{wedding.couple_names}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{wedding.couple_names}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {formattedDate} {t('planner.weddings.at')} {wedding.wedding_time} • {wedding.location}
              </p>
            </div>
            <Link
              href={`/planner/weddings/${weddingId}/edit`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('planner.weddings.edit')}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">{t('planner.weddings.totalGuests')}</p>
            <p className="text-3xl font-bold text-gray-900">{wedding.guest_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">{t('planner.weddings.rsvpCompletion')}</p>
            <p className="text-3xl font-bold text-gray-900">{wedding.rsvp_completion_percentage}%</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">{t('planner.weddings.attending')}</p>
            <p className="text-3xl font-bold text-gray-900">{wedding.attending_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">{t('planner.weddings.paymentsReceived')}</p>
            <p className="text-3xl font-bold text-gray-900">{wedding.payment_received_count}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('planner.weddings.quickActions')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Link
              href={`/planner/weddings/${weddingId}/guests`}
              className="bg-white border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-lg p-6 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {t('admin.dashboard.guestList')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('admin.dashboard.guestListSubtitle')}
                  </p>
                </div>
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/checklist`}
              className="bg-white border-2 border-teal-200 hover:border-teal-400 hover:bg-teal-50 rounded-lg p-6 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {t('planner.checklist.title') || 'Wedding Checklist'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('planner.checklist.description') || 'Manage tasks and track progress'}
                  </p>
                </div>
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
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/notifications`}
              className="bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg p-6 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {t('admin.dashboard.activity')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('admin.dashboard.activitySubtitle')}
                  </p>
                </div>
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
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/seating`}
              className="bg-white border-2 border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50 rounded-lg p-6 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {t('admin.dashboard.seatingPlan')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('admin.dashboard.seatingPlanSubtitle')}
                  </p>
                </div>
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
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/invitation-builder`}
              className="bg-white border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg p-6 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {t('admin.dashboard.invitationBuilder')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('admin.dashboard.invitationBuilderSubtitle')}
                  </p>
                </div>
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
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/providers`}
              className="bg-white border-2 border-green-200 hover:border-green-400 hover:bg-green-50 rounded-lg p-6 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {t('planner.providers.title') || 'Providers'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('planner.providers.description') || 'Manage providers and payments'}
                  </p>
                </div>
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
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </Link>

            <Link
              href={`/planner/weddings/${weddingId}/reports`}
              className="bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-lg p-6 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {t('admin.reports.title')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('admin.reports.subtitle')}
                  </p>
                </div>
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
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Wedding Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('planner.weddings.weddingInfo')}</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('planner.weddings.status')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {t(`planner.weddings.statusLabels.${wedding.status}`)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('planner.weddings.defaultLanguage')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{t(`common.languages.${wedding.default_language}`)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('planner.weddings.paymentMode')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{wedding.payment_tracking_mode}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('planner.weddings.rsvpCutoff')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(wedding.rsvp_cutoff_date).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('planner.weddings.guestAdditions')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {wedding.allow_guest_additions ? t('planner.weddings.allowed') : t('planner.weddings.notAllowed')}
                </dd>
              </div>
              {wedding.dress_code && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('planner.weddings.dressCode')}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{wedding.dress_code}</dd>
                </div>
              )}
              {wedding.additional_info && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('planner.weddings.additionalInfo')}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{wedding.additional_info}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Wedding Admins */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">{t('planner.weddings.weddingAdmins')}</h2>
              <button
                onClick={() => setShowInviteForm(true)}
                className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {t('planner.admins.invite')}
              </button>
            </div>

            {admins.length === 0 ? (
              <p className="text-sm text-gray-500">{t('planner.weddings.noAdmins')}</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {admins.map((admin) => (
                  <li key={admin.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{admin.name}</p>
                      <p className="text-sm text-gray-500">{admin.email}</p>
                      {admin.accepted_at ? (
                        <p className="text-xs text-green-600 mt-1">{t('planner.weddings.accepted')}</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">{t('planner.weddings.pending')}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      aria-label={t('planner.admins.remove')}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      {/* Invite Admin Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
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
