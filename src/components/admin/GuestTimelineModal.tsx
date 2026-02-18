/**
 * Guest Timeline Modal Component
 *
 * Displays a timeline of tracking events for a specific family/guest
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { EventType, Channel } from '@/types/models';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

interface TrackingEventWithFamily {
  id: string;
  family_id: string;
  event_type: EventType | 'GUEST_CREATED';
  channel: Channel | null;
  metadata: Record<string, unknown> | null;
  admin_triggered: boolean;
  timestamp: Date;
  family_name: string;
  triggered_by_user?: {
    name: string;
    email: string;
  } | null;
}

interface GuestTimelineModalProps {
  isOpen: boolean;
  familyId: string | null;
  familyName: string | null;
  onClose: () => void;
  apiBase?: string;
}

const getEventIcon = (eventType: EventType | 'GUEST_CREATED'): string => {
  const icons: Record<EventType | 'GUEST_CREATED', string> = {
    LINK_OPENED: '🔗',
    RSVP_STARTED: '📝',
    RSVP_SUBMITTED: '✅',
    RSVP_UPDATED: '✏️',
    GUEST_ADDED: '👤',
    GUEST_CREATED: '➕',
    PAYMENT_RECEIVED: '💰',
    REMINDER_SENT: '🔔',
    INVITATION_SENT: '💌',
    SAVE_THE_DATE_SENT: '📅',
    TASK_ASSIGNED: '📋',
    TASK_COMPLETED: '✓',
    MESSAGE_DELIVERED: '📬',
    MESSAGE_READ: '👁️',
    MESSAGE_FAILED: '❌',
    MESSAGE_RECEIVED: '💬',
    AI_REPLY_SENT: '🤖',
  };
  return icons[eventType] || '📌';
};

const getEventColor = (eventType: EventType | 'GUEST_CREATED'): string => {
  const colors: Record<EventType | 'GUEST_CREATED', string> = {
    LINK_OPENED: 'bg-blue-100 text-blue-800',
    RSVP_STARTED: 'bg-yellow-100 text-yellow-800',
    RSVP_SUBMITTED: 'bg-green-100 text-green-800',
    RSVP_UPDATED: 'bg-purple-100 text-purple-800',
    GUEST_ADDED: 'bg-indigo-100 text-indigo-800',
    GUEST_CREATED: 'bg-gray-100 text-gray-800',
    PAYMENT_RECEIVED: 'bg-green-100 text-green-800',
    REMINDER_SENT: 'bg-orange-100 text-orange-800',
    INVITATION_SENT: 'bg-pink-100 text-pink-800',
    SAVE_THE_DATE_SENT: 'bg-cyan-100 text-cyan-800',
    TASK_ASSIGNED: 'bg-gray-100 text-gray-800',
    TASK_COMPLETED: 'bg-green-100 text-green-800',
    MESSAGE_DELIVERED: 'bg-blue-100 text-blue-800',
    MESSAGE_READ: 'bg-teal-100 text-teal-800',
    MESSAGE_FAILED: 'bg-red-100 text-red-800',
    MESSAGE_RECEIVED: 'bg-violet-100 text-violet-800',
    AI_REPLY_SENT: 'bg-sky-100 text-sky-800',
  };
  return colors[eventType] || 'bg-gray-100 text-gray-800';
};

const formatTimestamp = (timestamp: Date): string => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export function GuestTimelineModal({
  isOpen,
  familyId,
  familyName,
  onClose,
  apiBase = '/api/admin',
}: GuestTimelineModalProps) {
  const t = useTranslations();
  const [events, setEvents] = useState<TrackingEventWithFamily[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!familyId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/guests/${familyId}/timeline`);
      if (!response.ok) {
        throw new Error('Failed to fetch timeline');
      }
      const data = await response.json();
      // APIResponse wrapper puts the actual payload in 'data' property
      setEvents(data.data?.events || []);
    } catch (err) {
      console.error('Error fetching timeline:', err);
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }, [familyId, apiBase]);

  useEffect(() => {
    if (isOpen && familyId) {
      fetchTimeline();
    }
  }, [isOpen, familyId, fetchTimeline]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('admin.guests.timeline.title')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {familyName && (
            <p className="mt-1 text-sm text-gray-500">
              {t('admin.guests.timeline.subtitle', { family: familyName })}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex justify-center items-center h-48">
              <WeddingSpinner size="md" className="mx-auto" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-800">{error}</p>
              <button
                onClick={fetchTimeline}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                {t('common.buttons.retry')}
              </button>
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="text-center py-12">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                {t('admin.guests.timeline.noEvents')}
              </p>
            </div>
          )}

          {!loading && !error && events.length > 0 && (
            <div className="space-y-4">
              {events.map((event, index) => {
                const templateName = event.metadata && typeof event.metadata === 'object' && 'template_name' in event.metadata
                  ? String(event.metadata.template_name)
                  : null;

                return (
                <div key={event.id} className="relative">
                  {/* Timeline connector line */}
                  {index < events.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200 -mb-4"></div>
                  )}

                  {/* Event card */}
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${getEventColor(event.event_type)}`}
                    >
                      {getEventIcon(event.event_type)}
                    </div>

                    {/* Event details */}
                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {event.event_type === 'GUEST_CREATED'
                              ? t('admin.guests.timeline.guestCreated')
                              : t(`admin.notifications.eventTypes.${event.event_type}`)}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatTimestamp(event.timestamp)}
                          </p>
                          {event.triggered_by_user && (
                            <p className="mt-1 text-xs text-gray-600">
                              <span className="font-medium">Triggered by:</span> {event.triggered_by_user.name}
                            </p>
                          )}
                        </div>
                        {event.channel && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {t(`common.channels.${event.channel}`)}
                          </span>
                        )}
                      </div>

                      {/* Metadata */}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          {event.admin_triggered && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-800 mr-2">
                              {t('admin.notifications.adminTriggered')}
                            </span>
                          )}
                          {templateName && (
                            <span className="text-gray-500">
                              Template: {templateName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('common.buttons.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
