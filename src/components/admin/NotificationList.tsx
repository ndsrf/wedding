/**
 * Notification List Component
 *
 * Displays a list of notifications/tracking events
 * Shows event type, family, channel, and timestamp
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useFormatter } from 'next-intl';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import { WhatsAppMessageBubble } from '@/components/shared/WhatsAppMessageBubble';
import type { EventType, Channel } from '@/types/models';

interface NotificationItem {
  id: string;
  wedding_id: string;
  family_id: string;
  event_type: EventType;
  channel: Channel | null;
  details: Record<string, unknown>;
  read: boolean;
  read_at: Date | null;
  admin_id: string;
  created_at: Date;
  family?: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface NotificationListProps {
  notifications: NotificationItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onMarkRead?: (notificationId: string) => void;
  loading?: boolean;
}

const getEventTypeIcon = (type: EventType): React.ReactNode => {
  switch (type) {
    case 'LINK_OPENED':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    case 'RSVP_STARTED':
    case 'RSVP_SUBMITTED':
    case 'RSVP_UPDATED':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'GUEST_ADDED':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      );
    case 'PAYMENT_RECEIVED':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'INVITATION_SENT':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'SAVE_THE_DATE_SENT':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'REMINDER_SENT':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    case 'MESSAGE_DELIVERED':
    case 'MESSAGE_READ':
    case 'MESSAGE_FAILED':
    case 'MESSAGE_RECEIVED':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case 'AI_REPLY_SENT':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.711-1.412 2.292l-6.254-1.75a3.75 3.75 0 00-2.036 0l-6.254 1.75c-1.442.419-2.412-1.292-1.412-2.292L5 14.5" />
        </svg>
      );
    default:
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

const getEventTypeColor = (type: EventType): string => {
  switch (type) {
    case 'RSVP_STARTED':
      return 'text-amber-600 bg-amber-100';
    case 'RSVP_SUBMITTED':
    case 'RSVP_UPDATED':
      return 'text-green-600 bg-green-100';
    case 'PAYMENT_RECEIVED':
      return 'text-blue-600 bg-blue-100';
    case 'GUEST_ADDED':
      return 'text-purple-600 bg-purple-100';
    case 'INVITATION_SENT':
      return 'text-blue-600 bg-blue-100';
    case 'SAVE_THE_DATE_SENT':
      return 'text-teal-600 bg-teal-100';
    case 'REMINDER_SENT':
      return 'text-orange-600 bg-orange-100';
    case 'MESSAGE_DELIVERED':
      return 'text-green-600 bg-green-100';
    case 'MESSAGE_READ':
      return 'text-blue-600 bg-blue-100';
    case 'MESSAGE_FAILED':
      return 'text-red-600 bg-red-100';
    case 'MESSAGE_RECEIVED':
      return 'text-violet-600 bg-violet-100';
    case 'AI_REPLY_SENT':
      return 'text-sky-600 bg-sky-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export function NotificationList({ 
  notifications, 
  selectedIds, 
  onSelectionChange, 
  onMarkRead, 
  loading 
}: NotificationListProps) {
  const t = useTranslations();
  const format = useFormatter();
  const router = useRouter();

  const handleNotificationClick = (familyName: string) => {
    // Navigate to guests page with search filter for this family
    router.push(`/admin/guests?search=${encodeURIComponent(familyName)}`);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectionChange(notifications.map(n => n.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const allSelected = notifications.length > 0 && selectedIds.length === notifications.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < notifications.length;

  const getEventTypeLabel = (type: EventType): string => {
    const keyMap: Record<EventType, string> = {
      LINK_OPENED: 'linkOpened',
      INVITATION_SENT: 'invitationSent',
      SAVE_THE_DATE_SENT: 'saveTheDateSent',
      RSVP_STARTED: 'rsvpStarted',
      RSVP_SUBMITTED: 'rsvpSubmitted',
      RSVP_UPDATED: 'rsvpEdited',
      GUEST_ADDED: 'guestAdded',
      PAYMENT_RECEIVED: 'paymentReceived',
      REMINDER_SENT: 'reminderSent',
      TASK_ASSIGNED: 'taskAssigned',
      TASK_COMPLETED: 'taskCompleted',
      MESSAGE_DELIVERED: 'messageDelivered',
      MESSAGE_READ: 'messageRead',
      MESSAGE_FAILED: 'messageFailed',
      MESSAGE_RECEIVED: 'messageReceived',
      AI_REPLY_SENT: 'aiReplySent',
    };

    const key = keyMap[type] || 'linkOpened';
    return t(`admin.notifications.events.${key}`);
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <WeddingSpinner size="md" className="mx-auto" />
        <p className="mt-4 text-gray-500">{t('admin.notifications.loading')}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
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
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('admin.notifications.emptyTitle')}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('admin.notifications.emptyDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Selection Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
        <div className="flex items-center h-5">
          <input
            id="select-all"
            type="checkbox"
            checked={allSelected}
            ref={el => {
              if (el) el.indeterminate = isIndeterminate;
            }}
            onChange={handleSelectAll}
            className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
        </div>
        <label htmlFor="select-all" className="ml-3 text-sm font-medium text-gray-700">
          {selectedIds.length > 0 
            ? t('common.selection.selectedCount', { count: selectedIds.length })
            : t('common.selection.selectAll')
          }
        </label>
      </div>

      <ul className="divide-y divide-gray-200">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`p-4 hover:bg-gray-50 flex items-start space-x-4 ${!notification.read ? 'bg-purple-50/50' : ''}`}
          >
            <div className="flex items-center h-5 pt-1">
              <input
                type="checkbox"
                checked={selectedIds.includes(notification.id)}
                onChange={() => handleSelectOne(notification.id)}
                className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
            </div>
            
            <div className={`p-2 rounded-full ${getEventTypeColor(notification.event_type)} flex-shrink-0`}>
              {getEventTypeIcon(notification.event_type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">
                  {getEventTypeLabel(notification.event_type)}
                </p>
                <p className="text-xs text-gray-500">
                  {format.relativeTime(new Date(notification.created_at), new Date())}
                </p>
              </div>
              
              {notification.family && (
                <p className="text-sm text-gray-600 mt-1">
                  <span 
                    onClick={() => handleNotificationClick(notification.family!.name)}
                    className="font-semibold text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                  >
                    {notification.family.name}
                  </span>
                  {notification.channel && (
                    <span className="text-gray-400 ml-2">via {notification.channel}</span>
                  )}
                </p>
              )}
              
              {notification.event_type === 'MESSAGE_RECEIVED' && notification.details?.body ? (
                <WhatsAppMessageBubble
                  message={String(notification.details.body)}
                  aiReply={notification.details.ai_reply ? String(notification.details.ai_reply) : null}
                />
              ) : null}
              {notification.event_type === 'AI_REPLY_SENT' && notification.details?.reply_preview ? (
                <WhatsAppMessageBubble
                  message={String(notification.details.reply_preview)}
                  messageLabel="AI Reply"
                />
              ) : null}
              {!notification.read && onMarkRead && (
                <button
                  onClick={() => onMarkRead(notification.id)}
                  className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  {t('admin.notifications.markAsRead')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
