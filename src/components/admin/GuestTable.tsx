/**
 * Guest Table Component
 *
 * Displays a list of guests/families in a table or card format
 * Shows family name, members, RSVP status, and payment status
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { FamilyWithMembers, GiftStatus } from '@/types/models';

interface GuestWithStatus extends FamilyWithMembers {
  rsvp_status: string;
  attending_count: number;
  total_members: number;
  payment_status: GiftStatus | null;
  invitation_sent: boolean;
}

interface GuestTableProps {
  guests: GuestWithStatus[];
  onEdit?: (guestId: string) => void;
  onDelete?: (guestId: string) => void;
  onSendReminder?: (guestId: string) => void;
  onViewTimeline?: (guestId: string, guestName: string) => void;
  loading?: boolean;
  selectedGuestIds?: string[];
  onSelectGuest?: (guestId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  showCheckboxes?: boolean;
}

const getRsvpBadgeClass = (status: string): string => {
  return status === 'submitted'
    ? 'bg-green-100 text-green-800'
    : 'bg-yellow-100 text-yellow-800';
};

const getPaymentBadgeClass = (status: GiftStatus | null): string => {
  if (!status) return 'bg-gray-100 text-gray-800';
  const classes: Record<GiftStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    RECEIVED: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
};

export function GuestTable({
  guests,
  onEdit,
  onDelete,
  onSendReminder,
  onViewTimeline,
  loading,
  selectedGuestIds = [],
  onSelectGuest,
  onSelectAll,
  showCheckboxes = false
}: GuestTableProps) {
  const t = useTranslations();

  // Only count guests who can be selected (not confirmed)
  const selectableGuests = guests.filter(g => g.rsvp_status !== 'submitted');
  const allSelectableSelected = selectableGuests.length > 0 &&
    selectableGuests.every(g => selectedGuestIds.includes(g.id));

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">{t('admin.guests.table.loading')}</p>
      </div>
    );
  }

  if (guests.length === 0) {
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
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('admin.guests.table.emptyTitle')}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('admin.guests.table.emptyDesc')}
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
              {showCheckboxes && onSelectAll && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelectableSelected}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    disabled={selectableGuests.length === 0}
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.guests.table.family')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.guests.table.members')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.guests.table.rsvp')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.guests.table.channel')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.guests.table.payment')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.guests.table.language')}
              </th>
              {(onEdit || onDelete || onSendReminder || onViewTimeline) && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.guests.table.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {guests.map((guest) => {
              const isSelectable = guest.rsvp_status !== 'submitted';
              const isSelected = selectedGuestIds.includes(guest.id);

              return (
                <tr key={guest.id} className="hover:bg-gray-50">
                  {showCheckboxes && onSelectGuest && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isSelectable ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectGuest(guest.id, e.target.checked)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{guest.name}</span>
                      {guest.email && (
                        <span className="text-sm text-gray-500">{guest.email}</span>
                      )}
                    </div>
                  </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {guest.attending_count} / {guest.total_members}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">{t('admin.dashboard.metricTitles.attending').toLowerCase()}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRsvpBadgeClass(guest.rsvp_status)}`}
                  >
                    {guest.rsvp_status === 'submitted' ? t('admin.guests.filters.confirmed') : t('admin.guests.filters.pending')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {guest.channel_preference ? t(`common.channels.${guest.channel_preference}`) : t('common.channels.none')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentBadgeClass(guest.payment_status)}`}
                  >
                    {guest.payment_status ? t(`admin.payments.statuses.${guest.payment_status.toLowerCase()}`) : 'None'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {t(`common.languages.${guest.preferred_language}`)}
                </td>
                {(onEdit || onDelete || onSendReminder || onViewTimeline) && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {onViewTimeline && (
                        <button
                          onClick={() => onViewTimeline(guest.id, guest.name)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title={t('admin.guests.timeline.viewTimeline')}
                        >
                          {t('admin.guests.timeline.timeline')}
                        </button>
                      )}
                      {onSendReminder && guest.rsvp_status !== 'submitted' && (
                        <button
                          onClick={() => onSendReminder(guest.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {guest.invitation_sent ? t('admin.reminders.sendReminder') : t('admin.reminders.sendInvite')}
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(guest.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          {t('common.buttons.edit')}
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(guest.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          {t('common.buttons.delete')}
                        </button>
                      )}
                    </div>
                  </td>
                )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200">
        {guests.map((guest) => {
          const isSelectable = guest.rsvp_status !== 'submitted';
          const isSelected = selectedGuestIds.includes(guest.id);

          return (
            <div key={guest.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-start gap-3 flex-1">
                  {showCheckboxes && onSelectGuest && isSelectable && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onSelectGuest(guest.id, e.target.checked)}
                      className="h-4 w-4 mt-0.5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  )}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{guest.name}</h3>
                    {guest.email && (
                      <p className="text-sm text-gray-600">{guest.email}</p>
                    )}
                  </div>
                </div>
              {(onEdit || onDelete || onSendReminder || onViewTimeline) && (
                <div className="flex gap-2 flex-wrap">
                  {onViewTimeline && (
                    <button
                      onClick={() => onViewTimeline(guest.id, guest.name)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      {t('admin.guests.timeline.timeline')}
                    </button>
                  )}
                  {onSendReminder && guest.rsvp_status !== 'submitted' && (
                    <button
                      onClick={() => onSendReminder(guest.id)}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      {guest.invitation_sent ? t('admin.reminders.sendReminder') : t('admin.reminders.sendInvite')}
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(guest.id)}
                      className="text-purple-600 hover:text-purple-900 text-sm"
                    >
                      {t('common.buttons.edit')}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(guest.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      {t('common.buttons.delete')}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRsvpBadgeClass(guest.rsvp_status)}`}
              >
                {guest.rsvp_status === 'submitted' ? t('admin.guests.filters.confirmed') : t('admin.guests.filters.pending')}
              </span>
              <span className="text-xs text-gray-600">
                {guest.attending_count}/{guest.total_members} {t('admin.dashboard.metricTitles.attending').toLowerCase()}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentBadgeClass(guest.payment_status)}`}
              >
                {guest.payment_status ? t(`admin.payments.statuses.${guest.payment_status.toLowerCase()}`) : t('admin.guests.table.noPayment')}
              </span>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}