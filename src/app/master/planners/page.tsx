/**
 * Master Admin - Planner Management Page
 *
 * Page for managing wedding planners
 * Allows creating new planners and enabling/disabling existing ones
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlannerList } from '@/src/components/master/PlannerList';
import { PlannerForm } from '@/src/components/master/PlannerForm';
import { useNamespacedTranslations } from '@/src/lib/i18n/client';

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
      setError(err instanceof Error ? err.message : tCommon('errors.generic'));
      console.error('Error fetching planners:', err);
    } finally {
      setIsLoading(false);
    }
  }, [router, tCommon]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('planners.title')}</h1>
              <p className="mt-1 text-sm text-gray-500">{t('planners.list')}</p>
            </div>
            <div className="flex space-x-3">
              <a
                href="/master"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {tCommon('buttons.back')}
              </a>
              <button
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Create Planner Form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('planners.add')}</h2>
            <PlannerForm onSubmit={handleCreatePlanner} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* Planner List */}
        <div className="bg-white shadow rounded-lg p-6">
          {isLoading && !planners.length ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{tCommon('loading')}</p>
            </div>
          ) : (
            <>
              <PlannerList planners={planners} onToggleStatus={handleToggleStatus} />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => fetchPlanners(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {tCommon('buttons.previous')}
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => fetchPlanners(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
