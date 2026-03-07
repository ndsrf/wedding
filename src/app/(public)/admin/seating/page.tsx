'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { StatsCard } from '@/components/planner/StatsCard';
import { SeatingConfig } from '@/components/admin/SeatingConfig';
import { SeatingAssignment } from '@/components/admin/SeatingAssignment';
import { SeatingLayout } from '@/components/admin/SeatingLayout';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { SeatingPlanData } from '@/types/api';
import PrivateHeader from '@/components/PrivateHeader';

export default function SeatingPlanPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SeatingPlanData | null>(null);
  const [activeTab, setActiveTab] = useState<'assignment' | 'config' | 'layout'>('config');

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/seating');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching seating data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      <PrivateHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 mr-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🪑 {t('admin.seating.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('admin.seating.subtitle')}</p>
          </div>
        </div>

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
                onClick={() => setActiveTab('config')}
                className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'config'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('admin.seating.config.title')}
              </button>
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
                onClick={() => setActiveTab('layout')}
                className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'layout'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('admin.seating.layout.title')}
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'config' && (
              <SeatingConfig
                tables={data.tables}
                onUpdate={fetchData}
              />
            )}
            {activeTab === 'assignment' && (
              <SeatingAssignment
                data={data}
                onUpdate={fetchData}
              />
            )}
            {activeTab === 'layout' && (
              <SeatingLayout
                data={data}
                onUpdate={fetchData}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
