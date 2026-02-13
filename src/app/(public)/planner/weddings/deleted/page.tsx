/**
 * Wedding Planner - Deleted Weddings Page
 *
 * Page for viewing all deleted weddings with restore functionality
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { WeddingCard } from '@/components/planner/WeddingCard';
import { Info, ArrowLeft } from 'lucide-react';
import type { WeddingWithStats } from '@/types/models';
import type { UpdateWeddingStatusRequest } from '@/types/api';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

export default function DeletedWeddingsPage() {
  const t = useTranslations();
  const [weddings, setWeddings] = useState<WeddingWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeletedWeddings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/planner/weddings/deleted');

      if (!response.ok) {
        throw new Error('Failed to fetch deleted weddings');
      }

      const data = await response.json();
      setWeddings(data.data.items);
    } catch (err) {
      setError(t('planner.weddings.loadError'));
      console.error('Error fetching deleted weddings:', err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDeletedWeddings();
  }, [fetchDeletedWeddings]);

  const handleRestore = async (weddingId: string) => {
    if (!confirm(t('planner.weddings.confirmRestore'))) return;

    try {
      const requestBody: UpdateWeddingStatusRequest = { action: 'undelete' };
      const response = await fetch(`/api/planner/weddings/${weddingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to restore wedding');
      }

      // Remove from list (it's now in active weddings)
      setWeddings(weddings.filter(w => w.id !== weddingId));
    } catch (err) {
      console.error('Error restoring wedding:', err);
      alert('Failed to restore wedding. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Link */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <Link
            href="/planner/weddings"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('planner.weddings.backToActive')}
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('planner.weddings.deletedWeddings')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('planner.weddings.deletedInfo')}
          </p>
        </div>
      </header>

      {/* Info Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                {t('planner.weddings.deletedInfo')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center">
            <WeddingSpinner size="md" />
            <p className="mt-2 text-sm text-gray-500">{t('planner.weddings.loading')}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && weddings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('planner.weddings.noDeletedWeddings')}</p>
            <Link
              href="/planner/weddings"
              className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('planner.weddings.backToActive')}
            </Link>
          </div>
        )}

        {!loading && !error && weddings.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {weddings.map((wedding) => (
              <div key={wedding.id} className="relative">
                <WeddingCard wedding={wedding} />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleRestore(wedding.id)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                  >
                    Restore
                  </button>
                  <Link
                    href={`/planner/weddings/${wedding.id}/edit`}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md text-center transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
