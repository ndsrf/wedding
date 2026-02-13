/**
 * Wedding Admin - Configure Wedding Page
 *
 * Allows wedding admins to configure RSVP settings and wedding details
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useFormatter } from 'next-intl';
import { WeddingConfigForm } from '@/components/admin/WeddingConfigForm';
import PrivateHeader from '@/components/PrivateHeader';
import type { UpdateWeddingConfigRequest, WeddingDetails } from '@/types/api';

export default function ConfigureWeddingPage() {
  const router = useRouter();
  const t = useTranslations('admin.configure');
  const format = useFormatter();
  const [wedding, setWedding] = useState<WeddingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  useEffect(() => {
    fetchWedding();
  }, []);

  const fetchWedding = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/wedding');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch wedding details');
      }

      setWedding(data.data);
    } catch (err) {
      console.error('Error fetching wedding:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wedding details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: UpdateWeddingConfigRequest) => {
    try {
      const response = await fetch('/api/admin/wedding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save configuration');
      }

      // Update local state with new data
      setWedding((prev) => (prev ? { ...prev, ...result.data } : null));
      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving configuration:', err);
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/admin');
  };

  const handleDeleteAllGuests = async () => {
    setDeleteAllLoading(true);
    try {
      const response = await fetch('/api/admin/guests/delete-all', {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete guests');
      }

      setShowDeleteAllDialog(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error deleting all guests:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete all guests');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48"></div>
              <div className="mt-2 h-4 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">
            {error || t('notFound')}
          </h1>
          <p className="mt-2 text-gray-600">{t('contactPlanner')}</p>
          <Link
            href="/admin"
            className="mt-4 inline-block px-4 py-3 text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            {t('backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PrivateHeader
        title={t('title')}
        subtitle={`${wedding.couple_names} • ${format.dateTime(new Date(wedding.wedding_date), {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`}
        backUrl="/admin"
        additionalContent={
          saveSuccess && (
            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
              {t('saveSuccess')}
            </div>
          )
        }
      />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WeddingConfigForm
          wedding={wedding}
          themes={wedding.available_themes}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />

        {/* Danger Zone */}
        <div className="mt-8 border-2 border-red-300 rounded-lg p-6 bg-red-50">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            {t('dangerZone.title')}
          </h3>
          <p className="text-sm text-red-700 mb-4">
            {t('dangerZone.description')}
          </p>
          <button
            onClick={() => setShowDeleteAllDialog(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {t('dangerZone.deleteAllGuests')}
          </button>
        </div>
      </main>

      {/* Delete All Guests Confirmation Dialog */}
      {showDeleteAllDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !deleteAllLoading && setShowDeleteAllDialog(false)} />

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      {t('dangerZone.deleteAllConfirmTitle')}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {t('dangerZone.deleteAllConfirmMessage')}
                      </p>
                      <p className="text-sm text-red-600 font-semibold mt-2">
                        {t('dangerZone.deleteAllWarning')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleDeleteAllGuests}
                  disabled={deleteAllLoading}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteAllLoading ? t('common.buttons.deleting') : t('dangerZone.confirmDelete')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteAllDialog(false)}
                  disabled={deleteAllLoading}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.buttons.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}