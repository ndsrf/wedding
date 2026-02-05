/**
 * Master Admin - Planner Management Page
 *
 * Page for managing wedding planners
 * Allows creating new planners and enabling/disabling existing ones
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlannerList } from '@/components/master/PlannerList';
import { PlannerForm } from '@/components/master/PlannerForm';
import { useNamespacedTranslations } from '@/lib/i18n/client';

interface Planner {
  id: string;
  name: string;
  email: string;
  logo_url: string | null;
  enabled: boolean;
  wedding_count: number;
  last_login_at: Date | null;
  created_at: Date;
}

interface PlannerFormData {
  name: string;
  email: string;
  logo_url: string;
}

export default function PlannersPage() {
  const t = useNamespacedTranslations('master');
  const tCommon = useNamespacedTranslations('common');
  const router = useRouter();

  const [planners, setPlanners] = useState<Planner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch planners from API
  const fetchPlanners = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/master/planners?page=${page}&limit=50`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/api/auth/signin');
          return;
        }
        throw new Error('Failed to fetch planners');
      }

      const data = await response.json();

      if (data.success) {
        setPlanners(data.data.items);
        setCurrentPage(data.data.pagination.page);
        setTotalPages(data.data.pagination.totalPages);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch planners');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching planners:', err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Create new planner
  const handleCreatePlanner = async (formData: PlannerFormData) => {
    try {
      const response = await fetch('/api/master/planners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          logo_url: formData.logo_url || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create planner');
      }

      // Success - refresh planner list and close form
      alert(tCommon('success.created'));
      setShowForm(false);
      fetchPlanners(currentPage);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : tCommon('errors.generic'));
      throw err;
    }
  };

  // Toggle planner enabled status
  const handleToggleStatus = async (plannerId: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/master/planners/${plannerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: !currentEnabled,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update planner');
      }

      // Success - refresh planner list
      alert(tCommon('success.updated'));
      fetchPlanners(currentPage);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : tCommon('errors.generic'));
      throw err;
    }
  };

  // Load planners on mount
  useEffect(() => {
    fetchPlanners(1);
  }, [fetchPlanners]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {t('planners.title')}
              </h1>
              <p className="mt-2 text-base text-gray-600">{t('planners.list')}</p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/master"
                className="inline-flex items-center px-5 py-2.5 border-2 border-gray-300 rounded-xl shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
              >
                {tCommon('buttons.back')}
              </Link>
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center px-5 py-2.5 border-2 border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
              >
                {showForm ? tCommon('buttons.cancel') : t('planners.add')}
              </button>
            </div>
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

        {/* Create Planner Form */}
        {showForm && (
          <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8 mb-6 border border-pink-100">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">{t('planners.add')}</h2>
            <PlannerForm onSubmit={handleCreatePlanner} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* Planner List */}
        <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8 border border-pink-100">
          {isLoading && !planners.length ? (
            <div className="text-center py-12">
              <p className="text-base text-gray-500">{tCommon('loading')}</p>
            </div>
          ) : (
            <>
              <PlannerList planners={planners} onToggleStatus={handleToggleStatus} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-pink-100">
                  <button
                    onClick={() => fetchPlanners(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="px-5 py-2.5 border-2 border-purple-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {tCommon('buttons.previous')}
                  </button>
                  <span className="text-base font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => fetchPlanners(currentPage + 1)}
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
