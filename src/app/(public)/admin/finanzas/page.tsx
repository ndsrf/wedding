/**
 * Wedding Admin - Finanzas (P&L) Page
 * /admin/finanzas
 */

'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { FinanzasPageContent } from '@/components/shared/FinanzasPageContent';

export default function AdminFinanzasPage() {
  const t = useTranslations('admin.finanzas');
  const { status } = useSession();
  const router = useRouter();
  const { coupleNames } = useWeddingAccess();
  useDocumentTitle(buildNupciTitle(t('title'), coupleNames));

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  return (
    <FinanzasPageContent
      apiBase="/api/admin/finanzas"
      weddingApiBase="/api/admin/wedding"
      backHref="/admin"
    />
  );
}
