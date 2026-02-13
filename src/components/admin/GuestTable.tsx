/**
 * Guest Table Component
 *
 * Displays a list of guests/families in a table or card format
 * Shows family name, members, RSVP status, and payment status
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
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
  onSendSaveTheDate?: (guestId: string) => void;
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

const getPreferredContact = (guest: GuestWithStatus): string | null => {
  if (!guest.channel_preference) {
    return guest.email || null;
  }

  switch (guest.channel_preference) {
    case 'WHATSAPP':
      return guest.whatsapp_number || guest.email || null;
    case 'SMS':
      return guest.phone || guest.email || null;
    case 'EMAIL':
    default:
      return guest.email || null;
  }
};

const getLanguageFlag = (language: string): string => {
  const flags: Record<string, string> = {
    'ES': '🇪🇸',
    'EN': '🇬🇧',
    'FR': '🇫🇷',
    'IT': '🇮🇹',
    'DE': '🇩🇪',
  };
  return flags[language] || language;
};

const getChannelIcon = (channel: string | null): React.ReactElement => {
  if (!channel) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  switch (channel) {
    case 'WHATSAPP':
      return (
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      );
    case 'EMAIL':
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'SMS':
      return (
        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      );
    default:
      return <span className="text-gray-400 text-xs">-</span>;
  }
};

export function GuestTable({
  guests,
  onEdit,
  onDelete,
  onSendReminder,
  onSendSaveTheDate,
  onViewTimeline,
  loading,
  selectedGuestIds = [],
  onSelectGuest,
  onSelectAll,
  showCheckboxes = false
}: GuestTableProps) {
  const t = useTranslations();
  const [expandedGuestIds, setExpandedGuestIds] = React.useState<string[]>([]);

  // Only count guests who can be selected (not confirmed)
  const selectableGuests = guests.filter(g => g.rsvp_status !== 'submitted');
  const allSelectableSelected = selectableGuests.length > 0 &&
    selectableGuests.every(g => selectedGuestIds.includes(g.id));

  const toggleExpanded = (guestId: string) => {
    setExpandedGuestIds(prev =>
      prev.includes(guestId)
        ? prev.filter(id => id !== guestId)
        : [...prev, guestId]
    );
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <WeddingSpinner size="md" className="mx-auto" />
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
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.guests.table.family')}
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.guests.table.members')}
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.guests.table.rsvp')}
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span title={t('admin.guests.table.channel')}>📢</span>
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.guests.table.payment')}
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span title={t('admin.guests.table.language')}>🌐</span>
              </th>
              {(onEdit || onDelete || onSendReminder || onSendSaveTheDate) && (
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {onViewTimeline && (
                        <button
                          onClick={() => onViewTimeline(guest.id, guest.name)}
                          className="p-0.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded flex-shrink-0"
                          title={t('admin.guests.timeline.viewTimeline')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">{guest.name}</span>
                        {getPreferredContact(guest) && (
                          <span className="text-xs text-gray-500 truncate">{getPreferredContact(guest)}</span>
                        )}
                      </div>
                    </div>
                  </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {guest.attending_count} / {guest.total_members}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRsvpBadgeClass(guest.rsvp_status)}`}
                  >
                    {guest.rsvp_status === 'submitted' ? '✓' : '⏳'}
                  </span>
                </td>
                <td className="px-2 py-4 whitespace-nowrap text-center">
                  <span title={guest.channel_preference ? t(`common.channels.${guest.channel_preference}`) : t('common.channels.none')}>
                    {getChannelIcon(guest.channel_preference)}
                  </span>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentBadgeClass(guest.payment_status)}`}
                  >
                    {guest.payment_status ? '💰' : '-'}
                  </span>
                </td>
                <td className="px-2 py-4 whitespace-nowrap text-center text-lg">
                  <span title={t(`common.languages.${guest.preferred_language}`)}>
                    {getLanguageFlag(guest.preferred_language)}
                  </span>
                </td>
                {(onEdit || onDelete || onSendReminder || onSendSaveTheDate) && (
                  <td className="px-2 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-0.5">
                      {onSendSaveTheDate && !guest.save_the_date_sent && !guest.invitation_sent && (
                        <button
                          onClick={() => onSendSaveTheDate(guest.id)}
                          className="p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded"
                          title={t('admin.reminders.sendSaveTheDate')}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                      {onSendReminder && guest.rsvp_status !== 'submitted' && (
                        <button
                          onClick={() => onSendReminder(guest.id)}
                          className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                          title={guest.invitation_sent ? t('admin.reminders.sendReminder') : t('admin.reminders.sendInvite')}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(guest.id)}
                          className="p-1 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded"
                          title={t('common.buttons.edit')}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(guest.id)}
                          className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                          title={t('common.buttons.delete')}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
          const isExpanded = expandedGuestIds.includes(guest.id);

          return (
            <div key={guest.id} className="p-4">
              {/* Compact View - Always Visible */}
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => toggleExpanded(guest.id)}
              >
                {/* Checkbox */}
                {showCheckboxes && onSelectGuest && isSelectable && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => onSelectGuest(guest.id, e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                )}

                {/* Timeline Icon */}
                {onViewTimeline && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTimeline(guest.id, guest.name);
                    }}
                    className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded flex-shrink-0"
                    title={t('admin.guests.timeline.viewTimeline')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                )}

                {/* Family Name & Members */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{guest.name}</h3>
                  <p className="text-xs text-gray-600">
                    {guest.attending_count}/{guest.total_members}
                  </p>
                </div>

                {/* RSVP Status */}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRsvpBadgeClass(guest.rsvp_status)}`}
                >
                  {guest.rsvp_status === 'submitted' ? t('admin.guests.filters.confirmed') : t('admin.guests.filters.pending')}
                </span>

                {/* Expand/Collapse Icon */}
                <svg
                  className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded View - Show on Click */}
              {isExpanded && (
                <div className="mt-4 space-y-3 border-t border-gray-200 pt-3">
                  {/* Contact Info */}
                  {getPreferredContact(guest) && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">{t('admin.guests.table.contact')}</p>
                      <p className="text-sm text-gray-900">{getPreferredContact(guest)}</p>
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-medium text-gray-500 mb-1">{t('admin.guests.table.channel')}</p>
                      <div title={guest.channel_preference ? t(`common.channels.${guest.channel_preference}`) : t('common.channels.none')}>
                        {getChannelIcon(guest.channel_preference)}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500 mb-1">{t('admin.guests.table.language')}</p>
                      <p className="text-gray-900 text-lg">
                        <span title={t(`common.languages.${guest.preferred_language}`)}>
                          {getLanguageFlag(guest.preferred_language)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">{t('admin.guests.table.payment')}</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentBadgeClass(guest.payment_status)}`}
                    >
                      {guest.payment_status ? t(`admin.payments.statuses.${guest.payment_status.toLowerCase()}`) : t('admin.guests.table.noPayment')}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  {(onEdit || onDelete || onSendReminder || onSendSaveTheDate) && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-2">{t('admin.guests.table.actions')}</p>
                      <div className="flex gap-1 flex-wrap">
                        {onSendSaveTheDate && !guest.save_the_date_sent && !guest.invitation_sent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendSaveTheDate(guest.id);
                            }}
                            className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded"
                            title={t('admin.reminders.sendSaveTheDate')}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                        {onSendReminder && guest.rsvp_status !== 'submitted' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendReminder(guest.id);
                            }}
                            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                            title={guest.invitation_sent ? t('admin.reminders.sendReminder') : t('admin.reminders.sendInvite')}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(guest.id);
                            }}
                            className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded"
                            title={t('common.buttons.edit')}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(guest.id);
                            }}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                            title={t('common.buttons.delete')}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}