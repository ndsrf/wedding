/**
 * Wedding Planner - Weddings List Page
 *
 * Page for viewing all weddings with create/edit functionality
 * Shows wedding cards with key statistics and actions
 */

'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { WeddingCard } from '@/components/planner/WeddingCard';
import { WeddingForm } from '@/components/planner/WeddingForm';
import type { WeddingWithStats, Theme } from '@/types/models';
import type { CreateWeddingRequest } from '@/types/api';

function PlannerWeddingsContent() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showCreateForm = searchParams.get('action') === 'create';

  const [weddings, setWeddings] = useState<WeddingWithStats[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(showCreateForm);

  const fetchWeddings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/planner/weddings');

      if (!response.ok) {
        throw new Error('Failed to fetch weddings');
      }

      const data = await response.json();
      setWeddings(data.data.items);
    } catch (err) {
      setError(t('planner.weddings.loadError'));
      console.error('Error fetching weddings:', err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchThemes = useCallback(async () => {
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
  }, []);

  // Fetch weddings and themes on mount
  useEffect(() => {
    fetchWeddings();
    fetchThemes();
  }, [fetchWeddings, fetchThemes]);

  const handleCreateWedding = async (formData: CreateWeddingRequest) => {
    try {
      // Clean up the form data before sending
      const cleanedData = {
        ...formData,
        // Convert empty string or null theme_id to undefined so it's omitted from JSON
        theme_id: formData.theme_id || undefined,
        // Ensure optional strings are either undefined or have content
        dress_code: formData.dress_code || undefined,
        additional_info: formData.additional_info || undefined,
      };

      const response = await fetch('/api/planner/weddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || t('planner.weddings.createError'));
      }

      // Refresh weddings list
      await fetchWeddings();

      // Close form
      setShowForm(false);
      router.push('/planner/weddings');
    } catch (err) {
      console.error('Error creating wedding:', err);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back to Dashboard Link */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <Link
            href="/planner"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('planner.weddings.backToDashboard')}
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/planner"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center mb-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                {t('common.navigation.dashboard')}
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{t('planner.dashboard.myWeddings')}</h1>
              <p className="mt-1 text-sm text-gray-500">{t('planner.weddings.manageEvents')}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/planner/weddings/deleted"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                {t('planner.weddings.viewDeleted')}
              </Link>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('planner.dashboard.createWedding')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">{t('planner.weddings.loading')}</p>
          </div>
        )}

        {/* Weddings List */}
        {!loading && weddings.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {weddings.map((wedding) => (
              <WeddingCard key={wedding.id} wedding={wedding} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && weddings.length === 0 && (
          <div className="bg-white shadow rounded-lg p-12 text-center">
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('planner.weddings.noWeddings')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('planner.weddings.getStarted')}</p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('planner.dashboard.createWedding')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Create Wedding Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('planner.weddings.create')}</h2>
            <WeddingForm
              onSubmit={handleCreateWedding}
              onCancel={() => {
                setShowForm(false);
                router.push('/planner/weddings');
              }}
              themes={themes}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlannerWeddingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <PlannerWeddingsContent />
    </Suspense>
  );
}
