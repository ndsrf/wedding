'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCoupleNames } from '@/hooks/useCoupleNames';
import { NotificationsPageContent } from '@/components/shared/NotificationsPageContent';

export default function NotificationsPage() {
  const t = useTranslations();
  const { id: weddingId } = useParams() as { id: string };
  const weddingName = useCoupleNames(weddingId);
  useDocumentTitle(weddingName ? `Nupci - ${weddingName} - ${t('admin.notifications.title')}` : `Nupci - ${t('admin.notifications.title')}`);

  return (
    <NotificationsPageContent
      apiPaths={{
        notifications: `/api/planner/weddings/${weddingId}/notifications`,
        notificationRead: (id) => `/api/planner/weddings/${weddingId}/notifications/${id}/read`,
        notificationsMarkRead: `/api/planner/weddings/${weddingId}/notifications/mark-read`,
        notificationsExport: `/api/planner/weddings/${weddingId}/notifications/export`,
        remindersPreview: `/api/planner/weddings/${weddingId}/reminders/preview`,
        reminders: `/api/planner/weddings/${weddingId}/reminders`,
      }}
      header={
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Link href={`/planner/weddings/${weddingId}`} className="text-gray-600 hover:text-gray-700 mr-4">
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
