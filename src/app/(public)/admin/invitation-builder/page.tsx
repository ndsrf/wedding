/**
 * Wedding Admin — Invitation Builder Page
 * /admin/invitation-builder
 *
 * Thin wrapper: resolves admin-specific API paths and renders the shared
 * InvitationBuilderPageContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { useTranslations } from 'next-intl';
import { InvitationBuilderPageContent } from '@/components/shared/InvitationBuilderPageContent';
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function AdminInvitationBuilderPage() {
  const t = useTranslations();
  const { coupleNames } = useWeddingAccess();
  useDocumentTitle(coupleNames ? `Nupci - ${coupleNames} - ${t('admin.invitationBuilder.title')}` : `Nupci - ${t('admin.invitationBuilder.title')}`);

  return (
    <InvitationBuilderPageContent
      apiPaths={{
        apiBase: '/api/admin',
        weddingApi: '/api/admin/wedding',
      }}
      backHref="/admin"
      previewUrl="/admin/invitation-builder/preview"
    />
  );
}
