/**
 * Wedding Access Validator
 *
 * Wrapper component that validates wedding access for admin users.
 * - Fetches wedding status on mount
 * - If deleted: redirects to first undeleted wedding or /admin/no-access
 * - If disabled: shows banner and sets read-only context
 * - Provides WeddingAccessContext to children
 */

'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { WeddingAccessProvider } from '@/contexts/WeddingAccessContext';
import type { GetWeddingDetailsResponse } from '@/types/api';

interface WeddingAccessValidatorProps {
  children: ReactNode;
}

export function WeddingAccessValidator({ children }: WeddingAccessValidatorProps) {
  const t = useTranslations();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isDisabled, setIsDisabled] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkWeddingAccess() {
      if (status === 'loading') return;
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/wedding');

        if (response.status === 404) {
          // Wedding not found or deleted - redirect to no-access page
          router.replace('/admin/no-access');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch wedding details');
        }

        const data: GetWeddingDetailsResponse = await response.json();

        if (data.success && data.data) {
          setIsDisabled(data.data.is_disabled || false);
          setIsDeleted(data.data.status === 'DELETED');

          // If deleted, redirect to no-access
          if (data.data.status === 'DELETED') {
            router.replace('/admin/no-access');
            return;
          }
        }
      } catch (err) {
        console.error('Error checking wedding access:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    checkWeddingAccess();
  }, [session, status, router]);

  // Show loading state while checking access
  if (isLoading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <WeddingAccessProvider isDisabled={isDisabled} isDeleted={isDeleted}>
      {isDisabled && (
        <div className="bg-yellow-50 border-b-4 border-yellow-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-yellow-800">
              This wedding has been disabled by the wedding planner. You can view data but cannot make changes.
            </p>
          </div>
        </div>
      )}
      {children}
    </WeddingAccessProvider>
  );
}
