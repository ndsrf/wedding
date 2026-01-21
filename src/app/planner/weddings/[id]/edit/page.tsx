/**
 * Wedding Planner - Edit Wedding Page
 *
 * Page for editing an existing wedding's details
 */

'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { WeddingForm } from '@/components/planner/WeddingForm';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { Wedding, Theme } from '@/types/models';
import type { CreateWeddingRequest, UpdateWeddingStatusRequest } from '@/types/api';

interface EditWeddingPageProps {
  params: Promise<{ id: string }>;
}

export default function EditWeddingPage({ params }: EditWeddingPageProps) {
  const t = useTranslations();
  const { id: weddingId } = use(params);
  const router = useRouter();

  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWedding = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/planner/weddings/${weddingId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(t('planner.weddings.notFound'));
        }
        throw new Error('Failed to fetch wedding');
      }

      const data = await response.json();
      setWedding(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errors.generic'));
      console.error('Error fetching wedding:', err);
    } finally {
      setLoading(false);
    }
  }, [weddingId, t]);

  useEffect(() => {
    fetchWedding();
    fetchThemes();
  }, [fetchWedding]);

  const fetchThemes = async () => {
    try {
      const response = await fetch('/api/planner/themes');

      if (!response.ok) {
        console.error('Failed to fetch themes');
        return;
      }

      const data = await response.json();
      setThemes(data.data || []);
    } catch (err) {
      console.error('Error fetching themes:', err);
    }
  };

  const handleUpdateWedding = async (formData: CreateWeddingRequest) => {
    try {
      // Explicitly construct update payload with only the fields the API expects
      const updateData: Record<string, unknown> = {
        couple_names: formData.couple_names,
        wedding_date: formData.wedding_date,
        wedding_time: formData.wedding_time,
        location: formData.location,
        rsvp_cutoff_date: formData.rsvp_cutoff_date,
        default_language: formData.default_language,
        payment_tracking_mode: formData.payment_tracking_mode,
        allow_guest_additions: formData.allow_guest_additions,
      };

      // Only include optional fields if they have values
      if (formData.theme_id) {
        updateData.theme_id = formData.theme_id;
      } else {
        updateData.theme_id = null;
      }

      if (formData.dress_code) {
        updateData.dress_code = formData.dress_code;
      }

      if (formData.additional_info) {
        updateData.additional_info = formData.additional_info;
      }

      const response = await fetch(`/api/planner/weddings/${weddingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update validation errors:', JSON.stringify(errorData.error?.details, null, 2));
        console.error('Sent data:', JSON.stringify(updateData, null, 2));
        throw new Error(errorData.error?.message || t('planner.weddings.updateError'));
      }

      router.push('/planner/weddings');
    } catch (err) {
      console.error('Error updating wedding:', err);
      throw err;
    }
  };

  const handleToggleDisable = async () => {
    if (!wedding) return;

    const action = wedding.is_disabled ? 'enable' : 'disable';
    const confirmMessage = wedding.is_disabled
      ? t('planner.weddings.confirmEnable')
      : t('planner.weddings.confirmDisable');

    if (!confirm(confirmMessage)) return;

    try {
      const requestBody: UpdateWeddingStatusRequest = { action };
      const response = await fetch(`/api/planner/weddings/${weddingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to update wedding status');
      }

      // Refresh wedding data
      await fetchWedding();
    } catch (err) {
      console.error('Error toggling wedding status:', err);
      alert('Failed to update wedding status. Please try again.');
    }
  };

  const handleDeleteWedding = async () => {
    if (!wedding) return;

    if (!confirm(t('planner.weddings.confirmDelete'))) return;

    try {
      const requestBody: UpdateWeddingStatusRequest = { action: 'delete' };
      const response = await fetch(`/api/planner/weddings/${weddingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to delete wedding');
      }

      // Redirect to weddings list
      router.push('/planner/weddings');
    } catch (err) {
      console.error('Error deleting wedding:', err);
      alert('Failed to delete wedding. Please try again.');
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <Link
              href="/planner/weddings"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('planner.weddings.backToWeddings')}
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || t('planner.weddings.notFound')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Link */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <Link
            href="/planner/weddings"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('planner.weddings.backToWeddings')}
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">{t('planner.weddings.edit')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('planner.weddings.updateDetails', { coupleNames: wedding.couple_names })}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Wedding Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <WeddingForm
            onSubmit={handleUpdateWedding}
            onCancel={() => router.push('/planner/weddings')}
            initialData={wedding}
            themes={themes}
          />
        </div>

        {/* Status Management Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('planner.weddings.statusManagement')}
          </h2>

          {/* Disable/Enable Toggle */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  {t('planner.weddings.disableWedding')}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('planner.weddings.disableDescription')}
                </p>
                {wedding.is_disabled && wedding.disabled_at && (
                  <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded inline-block">
                    {t('planner.weddings.disabledSince', {
                      date: new Date(wedding.disabled_at).toLocaleDateString(),
                    })}
                  </p>
                )}
              </div>
              <button
                onClick={handleToggleDisable}
                className={`ml-4 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  wedding.is_disabled
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {wedding.is_disabled ? t('planner.weddings.enable') : t('planner.weddings.disable')}
              </button>
            </div>
          </div>

          {/* Delete Wedding */}
          <div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  {t('planner.weddings.deleteWedding')}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('planner.weddings.deleteDescription')}
                </p>
              </div>
              <button
                onClick={handleDeleteWedding}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                {t('planner.weddings.delete')}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
