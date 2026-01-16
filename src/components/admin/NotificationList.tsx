/**
 * Notification List Component
 *
 * Displays a list of notifications/tracking events
 * Shows event type, family, channel, and timestamp
 */

'use client';

import React from 'react';
import type { EventType, Channel } from '@/src/types/models';

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
  onMarkRead?: (notificationId: string) => void;
  loading?: boolean;
}

const getEventTypeLabel = (type: EventType): string => {
  const labels: Record<EventType, string> = {
    LINK_OPENED: 'Link Opened',
    RSVP_STARTED: 'RSVP Started',
    RSVP_SUBMITTED: 'RSVP Submitted',
    RSVP_UPDATED: 'RSVP Updated',
    GUEST_ADDED: 'Guest Added',
    PAYMENT_RECEIVED: 'Payment Received',
    REMINDER_SENT: 'Reminder Sent',
  };
  return labels[type] || type;
};

const getEventTypeIcon = (type: EventType): React.ReactNode => {
  switch (type) {
    case 'LINK_OPENED':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
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
    case 'REMINDER_SENT':
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
    case 'RSVP_SUBMITTED':
    case 'RSVP_UPDATED':
      return 'text-green-600 bg-green-100';
    case 'PAYMENT_RECEIVED':
      return 'text-blue-600 bg-blue-100';
    case 'GUEST_ADDED':
      return 'text-purple-600 bg-purple-100';
    case 'REMINDER_SENT':
      return 'text-orange-600 bg-orange-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const formatTimestamp = (date: Date): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

export function NotificationList({ notifications, onMarkRead, loading }: NotificationListProps) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading notifications...</p>
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
        <p className="mt-1 text-sm text-gray-500">
          Activity from your guests will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-purple-50' : ''}`}
          >
            <div className="flex items-start space-x-4">
              <div className={`p-2 rounded-full ${getEventTypeColor(notification.event_type)}`}>
                {getEventTypeIcon(notification.event_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {getEventTypeLabel(notification.event_type)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTimestamp(notification.created_at)}
                  </p>
                </div>
                {notification.family && (
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.family.name}
                    {notification.channel && (
                      <span className="text-gray-400 ml-2">via {notification.channel}</span>
                    )}
                  </p>
                )}
                {!notification.read && onMarkRead && (
                  <button
                    onClick={() => onMarkRead(notification.id)}
                    className="mt-2 text-xs text-purple-600 hover:text-purple-800"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
