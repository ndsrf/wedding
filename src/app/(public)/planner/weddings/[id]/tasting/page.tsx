/**
 * Planner - Tasting Menu Page
 * /planner/weddings/[id]/tasting
 */

'use client';

import { useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCoupleNames } from '@/hooks/useCoupleNames';
import { TastingPageContent } from '@/components/shared/TastingPageContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlannerTastingPage({ params }: PageProps) {
  const { id: weddingId } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const t = useTranslations('admin.tastingMenu');
  const weddingName = useCoupleNames(weddingId);
  useDocumentTitle(buildNupciTitle(t('title'), weddingName));

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  return (
    <TastingPageContent
      apiBase={`/api/planner/weddings/${weddingId}/tasting`}
      backHref={`/planner/weddings/${weddingId}`}
      subtitle={weddingName}
    />
  );
}
