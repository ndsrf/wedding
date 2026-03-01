/**
 * Wedding Planner - Notifications Page
 *
 * Page for viewing activity notifications and sending reminders
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { NotificationList } from '@/components/admin/NotificationList';
import { ReminderModal } from '@/components/admin/ReminderModal';
import type { EventType, Channel, Language } from '@/types/models';

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

interface ReminderFamily {
  id: string;
  name: string;
  preferred_language: Language;
  channel_preference: Channel | null;
}

interface Filters {
  event_type?: EventType;
  channel?: Channel;
  date_from?: string;
  date_to?: string;
  read?: string; // 'false' = unread only (default), '' = all
}

export default function NotificationsPage() {
  const t = useTranslations();
  const params = useParams();
  const weddingId = params.id as string;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reminderFamilies, setReminderFamilies] = useState<ReminderFamily[]>([]);
  const [filters, setFilters] = useState<Filters>({ read: 'false' });
  const [loading, setLoading] = useState(true);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams();
      qParams.set('page', page.toString());
      if (filters.event_type) qParams.set('event_type', filters.event_type);
      if (filters.channel) qParams.set('channel', filters.channel);
      if (filters.date_from) qParams.set('date_from', filters.date_from);
      if (filters.date_to) qParams.set('date_to', filters.date_to);
      if (filters.read !== undefined && filters.read !== '') qParams.set('read', filters.read);

      const response = await fetch(`/api/planner/weddings/${weddingId}/notifications?${qParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data.items);
        setTotalPages(data.data.pagination.totalPages);
        setUnreadCount(data.data.unread_count);
        setSelectedIds([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [weddingId, page, filters]);

  const fetchReminderPreview = useCallback(async () => {
    setReminderLoading(true);
    try {
      const response = await fetch(`/api/planner/weddings/${weddingId}/reminders/preview`);
      // If endpoint doesn't exist yet
      if (!response.ok) {
        setReminderFamilies([]);
        return;
      }
      const data = await response.json();

      if (data.success) {
        setReminderFamilies(data.data.families);
      }
    } catch (error) {
      console.error('Error fetching reminder preview:', error);
      setReminderFamilies([]);
    } finally {
      setReminderLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleOpenReminderModal = () => {
    fetchReminderPreview();
    setShowReminderModal(true);
  };

  const handleSendReminders = async (channel: Channel | 'PREFERRED', validFamilyIds?: string[]) => {
    const response = await fetch(`/api/planner/weddings/${weddingId}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        ...(validFamilyIds && { family_ids: validFamilyIds }),
      }),
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || t('common.errors.generic'));
    }

    // Refresh notifications after sending
    fetchNotifications();
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      await fetch(`/api/planner/weddings/${weddingId}/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const handleBulkMarkRead = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      setLoading(true);
      await fetch(`/api/planner/weddings/${weddingId}/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notifications read:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/planner/weddings/${weddingId}/notifications/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'excel', filters }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notifications-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting notifications:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <Link href={`/planner/weddings/${weddingId}`} className="text-gray-600 hover:text-gray-700 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('admin.notifications.title')}</h1>
                <p className="mt-1 text-sm text-gray-600">
                  {t('admin.notifications.newActivities', {count: unreadCount})}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-3">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkMarkRead}
                  className="px-4 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                >
                  {t('admin.notifications.markAsRead')}
                </button>
              )}
              <button
                onClick={handleExport}
                className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.buttons.export')}
              </button>
              <button
                onClick={handleOpenReminderModal}
                className="px-4 py-3 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
              >
                {t('admin.reminders.send')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {/* Read Status */}
            <div>
              <label htmlFor="read_status" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.notifications.filters.readStatus')}
              </label>
              <select
                id="read_status"
                value={filters.read ?? 'false'}
                onChange={(e) => setFilters({ ...filters, read: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
              >
                <option value="false">{t('admin.notifications.filters.unread')}</option>
                <option value="">{t('admin.notifications.filters.all')}</option>
              </select>
            </div>

            {/* Event Type */}
            <div>
              <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.notifications.filters.eventType')}
              </label>
              <select
                id="event_type"
                value={filters.event_type || ''}
                onChange={(e) =>
                  setFilters({ ...filters, event_type: e.target.value as EventType || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
              >
                <option value="">{t('admin.guests.filters.all')}</option>
                <option value="LINK_OPENED">{t('admin.notifications.events.linkOpened')}</option>
                <option value="INVITATION_SENT">{t('admin.notifications.events.invitationSent')}</option>
                <option value="SAVE_THE_DATE_SENT">{t('admin.notifications.events.saveTheDateSent')}</option>
                <option value="RSVP_STARTED">{t('admin.notifications.events.rsvpStarted')}</option>
                <option value="RSVP_SUBMITTED">{t('admin.notifications.events.rsvpSubmitted')}</option>
                <option value="RSVP_UPDATED">{t('admin.notifications.events.rsvpEdited')}</option>
                <option value="GUEST_ADDED">{t('admin.notifications.events.guestAdded')}</option>
                <option value="PAYMENT_RECEIVED">{t('admin.notifications.events.paymentReceived')}</option>
                <option value="REMINDER_SENT">{t('admin.notifications.events.reminderSent')}</option>
                <option value="TASK_ASSIGNED">{t('admin.notifications.events.taskAssigned')}</option>
                <option value="TASK_COMPLETED">{t('admin.notifications.events.taskCompleted')}</option>
                <option value="MESSAGE_DELIVERED">{t('admin.notifications.events.messageDelivered')}</option>
                <option value="MESSAGE_READ">{t('admin.notifications.events.messageRead')}</option>
                <option value="MESSAGE_FAILED">{t('admin.notifications.events.messageFailed')}</option>
                <option value="MESSAGE_RECEIVED">{t('admin.notifications.events.messageReceived')}</option>
                <option value="AI_REPLY_SENT">{t('admin.notifications.events.aiReplySent')}</option>
              </select>
            </div>

            {/* Channel */}
            <div>
              <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.notifications.filters.channel')}
              </label>
              <select
                id="channel"
                value={filters.channel || ''}
                onChange={(e) =>
                  setFilters({ ...filters, channel: e.target.value as Channel || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
              >
                <option value="">{t('admin.guests.filters.all')}</option>
                <option value="WHATSAPP">{t('admin.guests.filters.whatsapp')}</option>
                <option value="EMAIL">{t('admin.guests.filters.email')}</option>
                <option value="SMS">{t('admin.guests.filters.sms')}</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label htmlFor="date_from" className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.forms.fromDate')}
              </label>
              <input
                type="date"
                id="date_from"
                value={filters.date_from?.split('T')[0] || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    date_from: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
              />
            </div>

            {/* Date To */}
            <div>
              <label htmlFor="date_to" className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.forms.toDate')}
              </label>
              <input
                type="date"
                id="date_to"
                value={filters.date_to?.split('T')[0] || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    date_to: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(filters.event_type || filters.channel || filters.date_from || filters.date_to || filters.read === '') && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setFilters({ read: 'false' })}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                {t('common.buttons.clearFilters')}
              </button>
            </div>
          )}
        </div>

        {/* Notification List */}
        <NotificationList
          notifications={notifications}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onMarkRead={handleMarkRead}
          loading={loading}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-2 py-3 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.buttons.previous')}
              </button>
              <span className="relative inline-flex items-center px-4 py-3 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                {t('common.pagination.page')} {page} {t('common.pagination.of')} {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="relative inline-flex items-center px-2 py-3 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.buttons.next')}
              </button>
            </nav>
          </div>
        )}
      </main>

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        eligibleFamilies={reminderFamilies}
        onSendReminders={handleSendReminders}
        loading={reminderLoading}
        apiBase={`/api/planner/weddings/${weddingId}`}
      />
    </div>
  );
}
