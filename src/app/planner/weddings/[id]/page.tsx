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
      // For now, we'll set it to empty array as the API might not return it
      setAdmins([]);
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
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      {t('planner.admins.remove')}
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
