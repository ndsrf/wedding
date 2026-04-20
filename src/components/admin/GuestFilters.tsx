/**
 * Guest Filters Component
 *
 * Filter controls for the guest list
 * Supports RSVP status, attendance, channel, payment status, and label filters
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { GuestLabel } from '@/types/models';

interface GuestFiltersProps {
  filters: {
    rsvp_status?: string;
    attendance?: string;
    channel?: string;
    payment_status?: string;
    invited_by_admin_id?: string;
    label_id?: string;
    search?: string;
  };
  admins: Array<{ id: string; name: string; email: string }>;
  labels?: GuestLabel[];
  onFilterChange: (filters: GuestFiltersProps['filters']) => void;
}

export function GuestFilters({ filters, admins, labels = [], onFilterChange }: GuestFiltersProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  // Auto-expand if filters are active
  React.useEffect(() => {
    if (hasActiveFilters) {
      setIsExpanded(true);
    }
  }, [hasActiveFilters]);

  const handleChange = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
      {/* Mobile Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 lg:hidden"
      >
        <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {t('common.buttons.filter')} {hasActiveFilters && `(${Object.values(filters).filter(v => v !== undefined && v !== '').length})`}
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filters Content */}
      <div className={`${isExpanded ? 'block' : 'hidden'} lg:block p-4`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.buttons.search')}
            </label>
            <input
              type="text"
              id="search"
              placeholder={t('admin.guests.filters.searchPlaceholder')}
              value={filters.search || ''}
              onChange={(e) => handleChange('search', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-900"
            />
          </div>

          {/* RSVP Status */}
          <div>
            <label htmlFor="rsvp_status" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.guests.rsvpStatus')}
            </label>
            <select
              id="rsvp_status"
              value={filters.rsvp_status || ''}
              onChange={(e) => handleChange('rsvp_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-900"
            >
              <option value="">{t('admin.guests.filters.all')}</option>
              <option value="pending">{t('admin.guests.filters.pending')}</option>
              <option value="submitted">{t('admin.guests.filters.submitted')}</option>
            </select>
          </div>

          {/* Attendance */}
          <div>
            <label htmlFor="attendance" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.guests.attendance')}
            </label>
            <select
              id="attendance"
              value={filters.attendance || ''}
              onChange={(e) => handleChange('attendance', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-900"
            >
              <option value="">{t('admin.guests.filters.all')}</option>
              <option value="yes">{t('admin.guests.filters.attending')}</option>
              <option value="no">{t('admin.guests.filters.notAttending')}</option>
              <option value="partial">{t('admin.guests.filters.partial')}</option>
            </select>
          </div>

          {/* Channel */}
          <div>
            <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.guests.channel')}
            </label>
            <select
              id="channel"
              value={filters.channel || ''}
              onChange={(e) => handleChange('channel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-900"
            >
              <option value="">{t('admin.guests.filters.all')}</option>
              <option value="WHATSAPP">{t('admin.guests.filters.whatsapp')}</option>
              <option value="EMAIL">{t('admin.guests.filters.email')}</option>
              <option value="SMS">{t('admin.guests.filters.sms')}</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.guests.paymentStatus')}
            </label>
            <select
              id="payment_status"
              value={filters.payment_status || ''}
              onChange={(e) => handleChange('payment_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-900"
            >
              <option value="">{t('admin.guests.filters.all')}</option>
              <option value="PENDING">{t('admin.guests.filters.pending')}</option>
              <option value="RECEIVED">{t('admin.guests.filters.received')}</option>
              <option value="CONFIRMED">{t('admin.guests.filters.confirmed')}</option>
            </select>
          </div>

          {/* Invited By */}
          <div>
            <label htmlFor="invited_by_admin_id" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.guests.invitedBy')}
            </label>
            <select
              id="invited_by_admin_id"
              value={filters.invited_by_admin_id || ''}
              onChange={(e) => handleChange('invited_by_admin_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-900"
            >
              <option value="">{t('admin.guests.filters.all')}</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name || admin.email}
                </option>
              ))}
            </select>
          </div>

          {/* Label */}
          {labels.length > 0 && (
            <div>
              <label htmlFor="label_id" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.guests.labels.title')}
              </label>
              <select
                id="label_id"
                value={filters.label_id || ''}
                onChange={(e) => handleChange('label_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-900"
              >
                <option value="">{t('admin.guests.filters.all')}</option>
                {labels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onFilterChange({})}
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              {t('admin.guests.filters.clearAll')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
