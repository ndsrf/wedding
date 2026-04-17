/**
 * Wedding Admin - Configure Wedding Page (thin wrapper)
 *
 * Resolves admin-specific context and delegates all rendering to the shared
 * ConfigurePageContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { useTranslations } from 'next-intl';
import PrivateHeader from '@/components/PrivateHeader';
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ConfigurePageContent } from '@/components/shared/ConfigurePageContent';

export default function ConfigureWeddingPage() {
  const t = useTranslations('admin.configure');
  const { coupleNames } = useWeddingAccess();
  useDocumentTitle(buildNupciTitle(t('title'), coupleNames));

  return (
    <ConfigurePageContent
      apiPaths={{
        weddingApi: '/api/admin/wedding',
        deleteAllGuests: '/api/admin/guests/delete-all',
      }}
      backUrl="/admin"
      header={
        <PrivateHeader
          title={t('title')}
          subtitle={coupleNames}
          backUrl="/admin"
        />
      }
    />
  );
}
