/**
 * Planner - Finanzas (P&L) Page
 * /planner/weddings/[id]/finanzas
 */

'use client';

import { useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCoupleNames } from '@/hooks/useCoupleNames';
import { FinanzasPageContent } from '@/components/shared/FinanzasPageContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlannerFinanzasPage({ params }: PageProps) {
  const { id: weddingId } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations('admin.finanzas');
  const weddingName = useCoupleNames(weddingId);
  useDocumentTitle(buildNupciTitle(t('title'), weddingName));

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  return (
    <FinanzasPageContent
      apiBase={`/api/planner/weddings/${weddingId}/finanzas`}
      weddingApiBase={`/api/planner/weddings/${weddingId}`}
      backHref={`/planner/weddings/${weddingId}`}
      subtitle={weddingName}
    />
  );
}
