/**
 * Planner - Tasting Menu Page
 * /planner/weddings/[id]/tasting
 */

'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TastingPageContent } from '@/components/shared/TastingPageContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlannerTastingPage({ params }: PageProps) {
  const { id: weddingId } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const [weddingName, setWeddingName] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch(`/api/planner/weddings/${weddingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setWeddingName(data.data?.couple_names ?? '');
      })
      .catch(() => {});
  }, [status, weddingId]);

  return (
    <TastingPageContent
      apiBase={`/api/planner/weddings/${weddingId}/tasting`}
      backHref={`/planner/weddings/${weddingId}`}
      subtitle={weddingName}
    />
  );
}
