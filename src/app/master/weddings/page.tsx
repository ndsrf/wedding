/**
 * Master Admin - Weddings Overview Page
 *
 * Read-only page displaying all weddings across all planners
 * Shows wedding details, planner information, and guest counts
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WeddingList } from '@/src/components/master/WeddingList';
import { useNamespacedTranslations } from '@/src/lib/i18n/client';

interface Wedding {
  id: string;
  couple_names: string;
  wedding_date: Date;
  location: string;
  planner_name: string;
  planner_email: string;
  family_count: number;
  admin_count: number;
  status: string;
}

export default function WeddingsPage() {
  const t = useNamespacedTranslations('master');
  const tCommon = useNamespacedTranslations('common');
  const router = useRouter();

  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch weddings from API
  const fetchWeddings = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/master/weddings?page=${page}&limit=50`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/api/auth/signin');
          return;
        }
        throw new Error('Failed to fetch weddings');
      }

      const data = await response.json();

      if (data.success) {
        setWeddings(data.data.items);
        setCurrentPage(data.data.pagination.page);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch weddings');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching weddings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Load weddings on mount
  useEffect(() => {
    fetchWeddings(1);
  }, [fetchWeddings]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {t('weddings.title')}
              </h1>
              <p className="mt-2 text-base text-gray-600">
                {t('weddings.list')} (Read-only)
              </p>
            </div>
            <a
              href="/master"
              className="inline-flex items-center px-5 py-2.5 border-2 border-gray-300 rounded-xl shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
            >
              {tCommon('buttons.back')}
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 text-base">
            {error}
          </div>
        )}

        {/* Wedding List */}
        <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8 border border-pink-100">
          {isLoading && !weddings.length ? (
            <div className="text-center py-12">
              <p className="text-base text-gray-500">{tCommon('loading')}</p>
            </div>
          ) : (
            <>
              <WeddingList weddings={weddings} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-pink-100">
                  <button
                    onClick={() => fetchWeddings(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="px-5 py-2.5 border-2 border-purple-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {tCommon('buttons.previous')}
                  </button>
                  <span className="text-base font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => fetchWeddings(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className="px-5 py-2.5 border-2 border-purple-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {tCommon('buttons.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
