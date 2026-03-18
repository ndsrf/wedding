'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { NotificationsPageContent } from '@/components/shared/NotificationsPageContent';
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotificationsPage() {
  const t = useTranslations();
  const { coupleNames } = useWeddingAccess();
  useDocumentTitle(buildNupciTitle(t('admin.notifications.title'), coupleNames));

  return (
    <NotificationsPageContent
      apiPaths={{
        notifications: '/api/admin/notifications',
        notificationRead: (id) => `/api/admin/notifications/${id}/read`,
        notificationsMarkRead: '/api/admin/notifications/mark-read',
        notificationsExport: '/api/admin/notifications/export',
        remindersPreview: '/api/admin/reminders/preview',
        reminders: '/api/admin/reminders',
      }}
      header={
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-600 hover:text-gray-700 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{t('admin.notifications.title')}</h1>
            </div>
          </div>
        </header>
      }
    />
  );
}
