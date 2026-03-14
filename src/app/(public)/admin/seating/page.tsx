/**
 * Wedding Admin – Seating Plan Page
 * /admin/seating
 *
 * Thin wrapper: resolves admin context and delegates to SeatingPageContent.
 */

'use client';

import { useTranslations } from 'next-intl';
import PrivateHeader from '@/components/PrivateHeader';
import { SeatingPageContent } from '@/components/shared/SeatingPageContent';

export default function AdminSeatingPage() {
  const t = useTranslations();

  return (
    <SeatingPageContent
      apiBase="/api/admin/seating"
      header={
        <PrivateHeader
          title={`🪑 ${t('admin.seating.title')}`}
          subtitle={t('admin.seating.subtitle')}
          backUrl="/admin"
        />
      }
    />
  );
}
