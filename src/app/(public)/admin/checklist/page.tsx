/**
 * Wedding Admin - Checklist Management Page
 *
 * Dedicated page for wedding admins to manage their wedding checklist
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { ChecklistEditor } from '@/components/admin/ChecklistEditor';
import { useWeddingAccess } from '@/contexts/WeddingAccessContext';
import PrivateHeader from '@/components/PrivateHeader';

export default function ChecklistPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const { isReadOnly } = useWeddingAccess();
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch wedding ID from session
  useEffect(() => {
    async function fetchWeddingInfo() {
      if (status === 'loading') return;

      if (!session?.user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      try {
        // Fetch wedding details to get wedding_id
        const response = await fetch('/api/admin/wedding');

        if (!response.ok) {
          throw new Error('Failed to fetch wedding details');
        }

        const data = await response.json();

        if (data.success && data.data?.id) {
          setWeddingId(data.data.id);
        } else {
          throw new Error('Wedding ID not found');
        }
      } catch (err) {
        console.error('Error fetching wedding info:', err);
        setError(err instanceof Error ? err.message : 'Failed to load wedding information');
      } finally {
        setLoading(false);
      }
    }

    fetchWeddingInfo();
  }, [session, status]);

  // Loading state
  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">{t('common.loading') || 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !weddingId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-600 hover:text-gray-700 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('admin.checklist.title') || 'Wedding Checklist'}
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-8">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('common.errors.generic') || 'Error'}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {error || t('admin.checklist.loadError')}
              </p>
              <Link
                href="/admin"
                className="mt-4 inline-block px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {t('common.navigation.backToDashboard') || 'Back to Dashboard'}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PrivateHeader
        title={t('admin.checklist.title') || 'Wedding Checklist'}
        subtitle={t('admin.checklist.subtitle') || 'Manage tasks and track progress for your wedding'}
        backUrl="/admin"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChecklistEditor weddingId={weddingId} readOnly={isReadOnly} />
      </main>
    </div>
  );
}
