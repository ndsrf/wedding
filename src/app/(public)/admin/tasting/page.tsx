/**
 * Wedding Admin - Tasting Menu Page
 * /admin/tasting
 */

'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { TastingPageContent } from '@/components/shared/TastingPageContent';

export default function AdminTastingPage() {
  const t = useTranslations('admin.tastingMenu');
  const { status } = useSession();
  const router = useRouter();
  const { isReadOnly, coupleNames } = useWeddingAccess();
  useDocumentTitle(coupleNames ? `Nupci - ${coupleNames} - ${t('title')}` : `Nupci - ${t('title')}`);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  return (
    <TastingPageContent
      apiBase="/api/admin/tasting"
      backHref="/admin"
      subtitle={t('description')}
      isReadOnly={isReadOnly}
    />
  );
}
