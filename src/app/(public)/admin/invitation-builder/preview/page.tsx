/**
 * Wedding Admin — Invitation Builder Preview Page
 * /admin/invitation-builder/preview
 *
 * Thin wrapper: renders the shared InvitationBuilderPreviewContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { InvitationBuilderPreviewContent } from '@/components/shared/InvitationBuilderPreviewContent';

export default function AdminInvitationPreviewPage() {
  return <InvitationBuilderPreviewContent />;
}
