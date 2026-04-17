/**
 * Admin Template Management Page (thin wrapper)
 *
 * Resolves admin-specific context and delegates all rendering to the shared
 * TemplatesPageContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { TemplatesPageContent } from '@/components/shared/TemplatesPageContent';

export default function TemplatesPage() {
  const t = useTranslations('admin.templates');
  const { data: session } = useSession();
  const { coupleNames } = useWeddingAccess();
  useDocumentTitle(buildNupciTitle(t('title'), coupleNames));

  const weddingId = (session?.user as unknown as { wedding_id?: string })?.wedding_id ?? '';

  return (
    <TemplatesPageContent
      apiPaths={{
        weddingConfig: '/api/admin/wedding',
        templates: '/api/admin/templates',
        templateUpdate: (id) => `/api/admin/templates/${id}`,
        apiBase: '/api/admin',
        weddingId,
      }}
      header={
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-600 hover:text-gray-700 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="mt-1 text-sm text-gray-600">{t('description')}</p>
              </div>
            </div>
          </div>
        </header>
      }
    />
  );
}
