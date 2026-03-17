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
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function AdminSeatingPage() {
  const t = useTranslations();
  const { coupleNames } = useWeddingAccess();
  useDocumentTitle(coupleNames ? `Nupci - ${coupleNames} - ${t('admin.seating.title')}` : `Nupci - ${t('admin.seating.title')}`);

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
