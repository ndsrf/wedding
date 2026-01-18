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
import type { Wedding, Theme } from '@/types/models';
import type { CreateWeddingRequest } from '@/types/api';

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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <WeddingForm
            onSubmit={handleUpdateWedding}
            onCancel={() => router.push('/planner/weddings')}
            initialData={wedding}
            themes={themes}
          />
        </div>
      </main>
    </div>
  );
}
