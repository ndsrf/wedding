'use client';

/**
 * Shared Seating Page Content
 *
 * Renders the full seating management UI (config, assignment, layout tabs)
 * for both the admin (/admin/seating) and planner (/planner/weddings/[id]/seating) views.
 *
 * The only differences between contexts are passed as props:
 *   - apiBase : the seating API root for this session
 *   - header  : role-specific header/nav rendered as a slot
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { StatsCard } from '@/components/planner/StatsCard';
import { SeatingConfig } from '@/components/admin/SeatingConfig';
import { SeatingAssignment } from '@/components/admin/SeatingAssignment';
import { SeatingLayout } from '@/components/admin/SeatingLayout';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { SeatingPlanData } from '@/types/api';

type Tab = 'config' | 'assignment' | 'layout';

export interface SeatingPageContentProps {
  /** e.g. /api/admin/seating  OR  /api/planner/weddings/:id/seating */
  apiBase: string;
  /** Role-specific header rendered at the very top of the page */
  header: React.ReactNode;
}

export function SeatingPageContent({ apiBase, header }: SeatingPageContentProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SeatingPlanData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('config');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiBase);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching seating data:', error);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <WeddingSpinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">{t('common.errors.generic')}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-3 bg-purple-600 text-white rounded-md"
        >
          {t('common.buttons.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {header}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title={t('admin.seating.stats.totalGuests')}
            value={data.stats.total_guests}
            colorClass="bg-blue-50 border-blue-200"
          />
          <StatsCard
            title={t('admin.seating.stats.confirmedGuests')}
            value={data.stats.confirmed_guests}
            colorClass="bg-green-50 border-green-200"
          />
          <StatsCard
            title={t('admin.seating.stats.totalSeats')}
            value={data.stats.total_seats}
            colorClass="bg-purple-50 border-purple-200"
          />
          <StatsCard
            title={t('admin.seating.stats.assignedSeats')}
            value={data.stats.assigned_seats}
            suffix={` / ${data.stats.confirmed_guests}`}
            colorClass="bg-yellow-50 border-yellow-200"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['config', 'assignment', 'layout'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t(`admin.seating.${tab}.title`)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'config' && (
              <SeatingConfig tables={data.tables} onUpdate={fetchData} apiBase={apiBase} />
            )}
            {activeTab === 'assignment' && (
              <SeatingAssignment data={data} onUpdate={fetchData} apiBase={apiBase} />
            )}
            {activeTab === 'layout' && (
              <SeatingLayout data={data} onUpdate={fetchData} apiBase={apiBase} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
