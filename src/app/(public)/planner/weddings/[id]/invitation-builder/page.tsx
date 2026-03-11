/**
 * Wedding Planner — Invitation Builder Page
 * /planner/weddings/[id]/invitation-builder
 *
 * Thin wrapper: resolves planner-specific API paths and renders the shared
 * InvitationBuilderPageContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import { use } from 'react';
import { InvitationBuilderPageContent } from '@/components/shared/InvitationBuilderPageContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlannerInvitationBuilderPage({ params }: PageProps) {
  const { id: weddingId } = use(params);
  const apiBase = `/api/planner/weddings/${weddingId}`;

  return (
    <InvitationBuilderPageContent
      apiPaths={{
        apiBase,
        weddingApi: apiBase,
      }}
      backHref={`/planner/weddings/${weddingId}`}
      previewUrl={`/planner/weddings/${weddingId}/invitation-builder/preview`}
    />
  );
}
