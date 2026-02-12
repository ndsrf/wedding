'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatsCard } from '@/components/planner/StatsCard';
import { SeatingConfig } from '@/components/admin/SeatingConfig';
import { SeatingAssignment } from '@/components/admin/SeatingAssignment';
import type { SeatingPlanData } from '@/types/api';

export default function SeatingPlanPage() {
  const t = useTranslations();
  const params = useParams();
  const weddingId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SeatingPlanData | null>(null);
  const [activeTab, setActiveTab] = useState<'assignment' | 'config'>('assignment');

  const apiBase = `/api/planner/weddings/${weddingId}/seating`;

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href={`/planner/weddings/${weddingId}`}
                className="p-2 text-gray-600 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="h-6 w-6"
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
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('admin.seating.title')}</h1>
                <p className="text-sm text-gray-600">{t('admin.seating.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

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
              <button
                onClick={() => setActiveTab('assignment')}
                className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'assignment'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('admin.seating.assignment.title')}
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'config'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('admin.seating.config.title')}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'assignment' ? (
              <SeatingAssignment
                data={data}
                onUpdate={fetchData}
                apiBase={apiBase}
              />
            ) : (
              <SeatingConfig
                tables={data.tables}
                onUpdate={fetchData}
                apiBase={apiBase}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
