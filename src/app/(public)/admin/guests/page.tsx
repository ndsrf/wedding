/**
 * Wedding Admin - Guest Management Page
 *
 * Thin wrapper that resolves admin-specific context (read-only flag, API paths)
 * and delegates all rendering to the shared GuestsPageContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import PrivateHeader from '@/components/PrivateHeader';
import { GuestsPageContent } from '@/components/shared/GuestsPageContent';
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';
import { useTranslations } from 'next-intl';

export default function GuestsPage() {
  const t = useTranslations();
  const { isReadOnly } = useWeddingAccess();

  return (
    <GuestsPageContent
      apiPaths={{
        apiBase: '/api/admin',
        guests: '/api/admin/guests',
        guestAdditions: '/api/admin/guest-additions',
        wedding: '/api/admin/wedding',
        admins: '/api/admin/admins',
        reminders: '/api/admin/reminders',
        saveTheDate: '/api/admin/save-the-date',
      }}
      isReadOnly={isReadOnly}
      header={
        <PrivateHeader
          title={t('admin.guests.title')}
          backUrl="/admin"
        />
      }
    />
  );
}
