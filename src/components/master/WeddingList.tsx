/**
 * Wedding List Component
 *
 * Read-only display of all weddings across all planners
 * Shows wedding details, planner info, and guest counts
 */

'use client';

import React from 'react';
import { useNamespacedTranslations, useFormatDate } from '@/src/lib/i18n/client';

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

interface WeddingListProps {
  weddings: Wedding[];
}

export function WeddingList({ weddings }: WeddingListProps) {
  const t = useNamespacedTranslations('master');
  const tCommon = useNamespacedTranslations('common');
  const formatDate = useFormatDate();

  if (weddings.length === 0) {
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
                {t('weddings.coupleName')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('weddings.date')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('weddings.location')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('weddings.planner')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('weddings.guestCount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admins
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {weddings.map((wedding) => (
              <tr key={wedding.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{wedding.couple_names}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(wedding.wedding_date, { dateStyle: 'medium' })}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{wedding.location}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{wedding.planner_name}</div>
                    <div className="text-sm text-gray-500">{wedding.planner_email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {wedding.family_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {wedding.admin_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {weddings.map((wedding) => (
          <div key={wedding.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-2">{wedding.couple_names}</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('weddings.date')}:</span>
                <span className="text-gray-900">
                  {formatDate(wedding.wedding_date, { dateStyle: 'medium' })}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">{t('weddings.location')}:</span>
                <span className="text-gray-900">{wedding.location}</span>
              </div>

              <div className="pt-2 mt-2 border-t border-gray-200">
                <div className="text-gray-500 text-xs mb-1">{t('weddings.planner')}:</div>
                <div className="font-medium text-gray-900">{wedding.planner_name}</div>
                <div className="text-gray-500 text-xs">{wedding.planner_email}</div>
              </div>

              <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
                <div>
                  <span className="text-gray-500">{t('weddings.guestCount')}:</span>
                  <span className="ml-2 font-medium text-gray-900">{wedding.family_count}</span>
                </div>
                <div>
                  <span className="text-gray-500">Admins:</span>
                  <span className="ml-2 font-medium text-gray-900">{wedding.admin_count}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
