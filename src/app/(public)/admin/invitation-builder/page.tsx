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

import { InvitationBuilderPageContent } from '@/components/shared/InvitationBuilderPageContent';

export default function AdminInvitationBuilderPage() {
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
