/**
 * Wedding Admin - Checklist Page (thin wrapper)
 *
 * Resolves admin-specific context and delegates all rendering to the shared
 * ChecklistPageContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import PrivateHeader from '@/components/PrivateHeader';
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ChecklistPageContent } from '@/components/shared/ChecklistPageContent';
import WeddingSpinner from '@/components/shared/WeddingSpinner';

export default function ChecklistPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const { isReadOnly, coupleNames } = useWeddingAccess();
  useDocumentTitle(buildNupciTitle(t('admin.checklist.title'), coupleNames));

  const weddingId = (session?.user as unknown as { wedding_id?: string })?.wedding_id;

  if (status === 'loading' || !weddingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <WeddingSpinner size="md" className="mx-auto" />
          <p className="mt-4 text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <ChecklistPageContent
      weddingId={weddingId}
      isReadOnly={isReadOnly}
      header={
        <PrivateHeader
          title={t('admin.checklist.title')}
          subtitle={t('admin.checklist.subtitle')}
          backUrl="/admin"
        />
      }
    />
  );
}
