/**
 * Wedding Planner - Wedding Checklist Management Page
 *
 * Dedicated page for wedding planners to manage a specific wedding's checklist
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChecklistEditor } from '@/components/admin/ChecklistEditor';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface ChecklistPageProps {
  params: Promise<{ id: string }>;
}

export default function ChecklistPage({ params }: ChecklistPageProps) {
  const t = useTranslations();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [weddingName, setWeddingName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setWeddingId(id);
    });
  }, [params]);

  // Fetch wedding info for display
  useEffect(() => {
    async function fetchWeddingInfo() {
      if (!weddingId) return;

      try {
        const response = await fetch(`/api/planner/weddings/${weddingId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch wedding details');
        }

        const data = await response.json();

        if (data.success && data.data) {
          setWeddingName(data.data.couple_names || '');
        } else {
          throw new Error('Wedding not found');
        }
      } catch (err) {
        console.error('Error fetching wedding info:', err);
        setError(err instanceof Error ? err.message : 'Failed to load wedding information');
      } finally {
        setLoading(false);
      }
    }

    fetchWeddingInfo();
  }, [weddingId]);

  // Loading state
  if (loading || !weddingId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <WeddingSpinner size="md" className="mx-auto" />
            <p className="mt-4 text-gray-500">{t('common.loading') || 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Link href={`/planner/weddings/${weddingId}`} className="text-gray-500 hover:text-gray-700 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('planner.checklist.title') || 'Wedding Checklist'}
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-8">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('common.errors.generic') || 'Error'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {error || 'Unable to load checklist'}
              </p>
              <Link
                href={`/planner/weddings/${weddingId}`}
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('planner.weddings.backToWedding') || 'Back to Wedding'}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href={`/planner/weddings/${weddingId}`} className="text-gray-500 hover:text-gray-700 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('planner.checklist.title') || 'Wedding Checklist'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {weddingName && `${weddingName} • `}
                  {t('planner.checklist.subtitle') || 'Manage tasks and track progress'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChecklistEditor weddingId={weddingId} readOnly={false} />
      </main>
    </div>
  );
}
