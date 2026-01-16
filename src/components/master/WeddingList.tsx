/**
 * Wedding List Component
 *
 * Read-only display of all weddings across all planners
 * Shows wedding details, planner info, and guest counts
 */

'use client';

import React from 'react';
import { useNamespacedTranslations, useFormatDate } from '@/lib/i18n/client';

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
                {t('weddings.coupleName')}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('weddings.date')}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('weddings.location')}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('weddings.planner')}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('weddings.guestCount')}
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Admins
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-pink-100">
            {weddings.map((wedding) => (
              <tr key={wedding.id} className="hover:bg-pink-50/50 transition-colors">
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="text-base font-semibold text-gray-900">{wedding.couple_names}</span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-base text-gray-600">
                  {formatDate(wedding.wedding_date, { dateStyle: 'medium' })}
                </td>
                <td className="px-6 py-5 text-base text-gray-600">{wedding.location}</td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div>
                    <div className="text-base font-semibold text-gray-900">{wedding.planner_name}</div>
                    <div className="text-sm text-gray-600">{wedding.planner_email}</div>
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-base text-gray-600">
                  {wedding.family_count}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-base text-gray-600">
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
          <div key={wedding.id} className="bg-white border-2 border-pink-200 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{wedding.couple_names}</h3>

            <div className="space-y-2 text-base">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('weddings.date')}:</span>
                <span className="text-gray-900 font-medium">
                  {formatDate(wedding.wedding_date, { dateStyle: 'medium' })}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">{t('weddings.location')}:</span>
                <span className="text-gray-900 font-medium">{wedding.location}</span>
              </div>

              <div className="pt-3 mt-3 border-t border-pink-200">
                <div className="text-gray-600 text-sm mb-1">{t('weddings.planner')}:</div>
                <div className="font-semibold text-gray-900">{wedding.planner_name}</div>
                <div className="text-gray-600 text-sm">{wedding.planner_email}</div>
              </div>

              <div className="flex justify-between pt-3 mt-3 border-t border-pink-200">
                <div>
                  <span className="text-gray-600">{t('weddings.guestCount')}:</span>
                  <span className="ml-2 font-semibold text-gray-900">{wedding.family_count}</span>
                </div>
                <div>
                  <span className="text-gray-600">Admins:</span>
                  <span className="ml-2 font-semibold text-gray-900">{wedding.admin_count}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
