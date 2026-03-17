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

import { useState, useEffect, use } from 'react';
import { useTranslations } from 'next-intl';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { InvitationBuilderPageContent } from '@/components/shared/InvitationBuilderPageContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlannerInvitationBuilderPage({ params }: PageProps) {
  const { id: weddingId } = use(params);
  const t = useTranslations();
  const apiBase = `/api/planner/weddings/${weddingId}`;
  const [weddingName, setWeddingName] = useState('');
  useDocumentTitle(weddingName ? `Nupci - ${weddingName} - ${t('admin.invitationBuilder.title')}` : `Nupci - ${t('admin.invitationBuilder.title')}`);

  useEffect(() => {
    if (!weddingId) return;
    fetch(`/api/planner/weddings/${weddingId}`)
      .then(r => r.json())
      .then(data => { if (data.success) setWeddingName(data.data?.couple_names ?? ''); })
      .catch(() => {});
  }, [weddingId]);

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
