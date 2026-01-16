/**
 * Planner List Component
 *
 * Displays list of wedding planners with status and actions
 * Allows enabling/disabling planners and shows wedding count
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useNamespacedTranslations, useFormatDate } from '@/lib/i18n/client';

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

interface PlannerListProps {
  planners: Planner[];
  onToggleStatus: (plannerId: string, currentEnabled: boolean) => Promise<void>;
}

export function PlannerList({ planners, onToggleStatus }: PlannerListProps) {
  const t = useNamespacedTranslations('master');
  const tCommon = useNamespacedTranslations('common');
  const formatDate = useFormatDate();

  const [actioningId, setActioningId] = useState<string | null>(null);

  const handleToggleStatus = async (plannerId: string, currentEnabled: boolean) => {
    const confirmMessage = currentEnabled
      ? t('planners.confirmDisable')
      : 'Are you sure you want to enable this planner?';

    if (!confirm(confirmMessage)) {
      return;
    }

    setActioningId(plannerId);
    try {
      await onToggleStatus(plannerId, currentEnabled);
    } catch (error) {
      console.error('Error toggling planner status:', error);
      alert(tCommon('errors.generic'));
    } finally {
      setActioningId(null);
    }
  };

  if (planners.length === 0) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border-2 border-dashed border-purple-300">
        <p className="text-base text-gray-600">{tCommon('noData')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-pink-200 border-2 border-pink-200 rounded-2xl overflow-hidden">
          <thead className="bg-gradient-to-r from-pink-50 to-purple-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('planners.name')}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('planners.email')}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('planners.status')}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('planners.weddingCount')}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('planners.lastLogin')}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-pink-100">
            {planners.map((planner) => (
              <tr key={planner.id} className="hover:bg-pink-50/50 transition-colors">
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="flex items-center">
                    {planner.logo_url && (
                      <Image
                        src={planner.logo_url}
                        alt={planner.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-xl mr-3 object-cover border-2 border-pink-200"
                      />
                    )}
                    <span className="text-base font-semibold text-gray-900">{planner.name}</span>
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-base text-gray-600">
                  {planner.email}
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span
                    className={`px-3 py-1.5 inline-flex text-sm leading-5 font-semibold rounded-full ${
                      planner.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {planner.enabled ? t('planners.enabled') : t('planners.disabled')}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-base text-gray-600">
                  {planner.wedding_count}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-base text-gray-600">
                  {planner.last_login_at
                    ? formatDate(planner.last_login_at, { dateStyle: 'short' })
                    : 'Never'}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-base">
                  <button
                    onClick={() => handleToggleStatus(planner.id, planner.enabled)}
                    disabled={actioningId === planner.id}
                    className={`font-semibold ${
                      planner.enabled
                        ? 'text-red-600 hover:text-red-800'
                        : 'text-green-600 hover:text-green-800'
                    } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    {actioningId === planner.id
                      ? tCommon('loading')
                      : planner.enabled
                        ? t('planners.disable')
                        : t('planners.enable')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {planners.map((planner) => (
          <div key={planner.id} className="bg-white border-2 border-pink-200 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                {planner.logo_url && (
                  <Image
                    src={planner.logo_url}
                    alt={planner.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-xl mr-3 object-cover border-2 border-pink-200"
                  />
                )}
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{planner.name}</h3>
                  <p className="text-base text-gray-600">{planner.email}</p>
                </div>
              </div>
              <span
                className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
                  planner.enabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {planner.enabled ? t('planners.enabled') : t('planners.disabled')}
              </span>
            </div>

            <div className="space-y-2 text-base mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('planners.weddingCount')}:</span>
                <span className="font-semibold text-gray-900">{planner.wedding_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('planners.lastLogin')}:</span>
                <span className="text-gray-900">
                  {planner.last_login_at
                    ? formatDate(planner.last_login_at, { dateStyle: 'short' })
                    : 'Never'}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleToggleStatus(planner.id, planner.enabled)}
              disabled={actioningId === planner.id}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-base ${
                planner.enabled
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              {actioningId === planner.id
                ? tCommon('loading')
                : planner.enabled
                  ? t('planners.disable')
                  : t('planners.enable')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
