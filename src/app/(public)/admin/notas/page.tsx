'use client';

import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { WeddingNotesEditor } from '@/components/shared/WeddingNotesEditor';
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import PrivateHeader from '@/components/PrivateHeader';
import WeddingSpinner from '@/components/shared/WeddingSpinner';
import type { AuthenticatedUser } from '@/types/api';

export default function AdminNotasPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const { coupleNames } = useWeddingAccess();
  useDocumentTitle(buildNupciTitle(t('notes.title'), coupleNames));

  const user = session?.user as AuthenticatedUser | undefined;
  const weddingId = user?.wedding_id ?? null;

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <WeddingSpinner size="md" />
      </div>
    );
  }

  if (!weddingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{t('common.errors.generic')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PrivateHeader
        backUrl="/admin"
        title={t('notes.title')}
        subtitle={coupleNames ?? undefined}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
              <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{t('notes.title')}</h1>
          </div>
          <p className="text-sm text-gray-500 ml-12">{t('notes.subtitle')}</p>
        </div>

        <WeddingNotesEditor
          weddingId={weddingId}
          authEndpoint="/api/admin/notes-liveblocks-auth"
          usersEndpoint="/api/admin/notes-users"
          currentUser={user ? { id: user.id, name: user.name ?? 'Admin', color: '#7c3aed' } : undefined}
        />
      </main>
    </div>
  );
}
