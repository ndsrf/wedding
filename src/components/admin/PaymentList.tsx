/**
 * Payment List Component
 *
 * Displays a list of payments/gifts with family info and status
 */

'use client';

import React from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { GiftStatus } from '@/types/models';

interface PaymentItem {
  id: string;
  family_id: string;
  wedding_id: string;
  amount: number;
  reference_code_used: string | null;
  auto_matched: boolean;
  status: GiftStatus;
  transaction_date: Date;
  created_at: Date;
  family: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface PaymentListProps {
  payments: PaymentItem[];
  onUpdateStatus?: (paymentId: string, status: GiftStatus) => void;
  loading?: boolean;
}

const getStatusBadgeClass = (status: GiftStatus): string => {
  const classes: Record<GiftStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    RECEIVED: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
};

export function PaymentList({ payments, onUpdateStatus, loading }: PaymentListProps) {
  const t = useTranslations();
  const format = useFormatter();

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <WeddingSpinner size="md" className="mx-auto" />
        <p className="mt-4 text-gray-500">{t('admin.payments.loading')}</p>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('admin.payments.emptyTitle')}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('admin.payments.emptyDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.payments.family')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.payments.amount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.payments.transactionDate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.payments.referenceCode')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.payments.status')}
              </th>
              {onUpdateStatus && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.guests.table.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {payment.family.name}
                    </span>
                    {payment.family.email && (
                      <span className="text-sm text-gray-500">{payment.family.email}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {format.number(payment.amount, { style: 'currency', currency: 'EUR' })}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format.dateTime(new Date(payment.transaction_date), {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {payment.reference_code_used ? (
                    <span className="text-sm font-mono text-gray-600">
                      {payment.reference_code_used}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                  {payment.auto_matched && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {t('admin.payments.auto')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(payment.status)}`}
                  >
                    {t(`admin.payments.statuses.${payment.status.toLowerCase()}`)}
                  </span>
                </td>
                {onUpdateStatus && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {payment.status === 'PENDING' && (
                      <button
                        onClick={() => onUpdateStatus(payment.id, 'RECEIVED')}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        {t('admin.payments.markReceived')}
                      </button>
                    )}
                    {payment.status === 'RECEIVED' && (
                      <button
                        onClick={() => onUpdateStatus(payment.id, 'CONFIRMED')}
                        className="text-green-600 hover:text-green-900"
                      >
                         {t('common.buttons.confirm')}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200">
        {payments.map((payment) => (
          <div key={payment.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">{payment.family.name}</h3>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {format.number(payment.amount, { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(payment.status)}`}
              >
                {t(`admin.payments.statuses.${payment.status.toLowerCase()}`)}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {format.dateTime(new Date(payment.transaction_date), {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
            </p>
            {onUpdateStatus && payment.status !== 'CONFIRMED' && (
              <div className="mt-3 flex space-x-3">
                {payment.status === 'PENDING' && (
                  <button
                    onClick={() => onUpdateStatus(payment.id, 'RECEIVED')}
                    className="text-sm text-blue-600 hover:text-blue-900"
                  >
                    {t('admin.payments.markReceived')}
                  </button>
                )}
                {payment.status === 'RECEIVED' && (
                  <button
                    onClick={() => onUpdateStatus(payment.id, 'CONFIRMED')}
                    className="text-sm text-green-600 hover:text-green-900"
                  >
                    {t('common.buttons.confirm')}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
