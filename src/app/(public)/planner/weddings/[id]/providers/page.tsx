'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { WeddingProviders } from '@/components/shared/WeddingProviders';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PlannerWeddingProvidersPage({ params }: PageProps) {
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

  const fetchWeddingInfo = useCallback(async () => {
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
  }, [weddingId]);

  useEffect(() => {
    if (weddingId) {
      fetchWeddingInfo();
    }
  }, [weddingId, fetchWeddingInfo]);

  if (loading || !weddingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <WeddingSpinner size="md" />
          <p className="mt-2 text-sm text-gray-500">{t('common.loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">{error}</h2>
          <Link
            href={`/planner/weddings/${weddingId}`}
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            {t('planner.weddings.backToWedding') || 'Back to Wedding'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <Link href={`/planner/weddings/${weddingId}`} className="text-gray-500 hover:text-gray-700 mr-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('planner.providers.title') || 'Providers'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {weddingName && `${weddingName} • `}
                {t('planner.providers.description') || 'Manage providers and payments'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WeddingProviders weddingId={weddingId} isPlanner={true} />
      </main>
    </div>
  );
}