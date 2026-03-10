/**
 * Admin Wedding Menu Selection Page
 *
 * Thin wrapper that resolves admin-specific context (API paths)
 * and delegates all rendering to the shared MenuPageContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { useTranslations } from 'next-intl';
import PrivateHeader from '@/components/PrivateHeader';
import { MenuPageContent } from '@/components/shared/MenuPageContent';

export default function AdminMenuPage() {
  const t = useTranslations('admin.menu');

  return (
    <MenuPageContent
      apiPaths={{ apiBase: '/api/admin/tasting' }}
      isReadOnly={false}
      header={
        <PrivateHeader
          title={`🍽️ ${t('title')}`}
          subtitle={t('description')}
          backUrl="/admin"
        />
      }
    />
  );
}
