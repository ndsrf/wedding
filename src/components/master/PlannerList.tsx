/**
 * Planner List Component
 *
 * Displays list of wedding planners with status and actions
 * Allows enabling/disabling planners and shows wedding count
 */

'use client';

import React, { useState } from 'react';
import { useNamespacedTranslations, useFormatDate } from '@/src/lib/i18n/client';

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
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">{tCommon('noData')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('planners.name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('planners.email')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('planners.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('planners.weddingCount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('planners.lastLogin')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {planners.map((planner) => (
              <tr key={planner.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {planner.logo_url && (
                      <img
                        src={planner.logo_url}
                        alt={planner.name}
                        className="h-8 w-8 rounded-full mr-3 object-cover"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-900">{planner.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {planner.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      planner.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {planner.enabled ? t('planners.enabled') : t('planners.disabled')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {planner.wedding_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {planner.last_login_at
                    ? formatDate(planner.last_login_at, { dateStyle: 'short' })
                    : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleToggleStatus(planner.id, planner.enabled)}
                    disabled={actioningId === planner.id}
                    className={`font-medium ${
                      planner.enabled
                        ? 'text-red-600 hover:text-red-900'
                        : 'text-green-600 hover:text-green-900'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
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
          <div key={planner.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                {planner.logo_url && (
                  <img
                    src={planner.logo_url}
                    alt={planner.name}
                    className="h-10 w-10 rounded-full mr-3 object-cover"
                  />
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{planner.name}</h3>
                  <p className="text-sm text-gray-500">{planner.email}</p>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  planner.enabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {planner.enabled ? t('planners.enabled') : t('planners.disabled')}
              </span>
            </div>

            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('planners.weddingCount')}:</span>
                <span className="font-medium text-gray-900">{planner.wedding_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('planners.lastLogin')}:</span>
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
              className={`w-full py-2 px-4 rounded-md font-medium text-sm ${
                planner.enabled
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
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
