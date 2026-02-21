'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function WizardButton() {
  const router = useRouter();
  const t = useTranslations('admin.dashboard');
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      // Reset wizard flags to allow restarting from the beginning
      const response = await fetch('/api/admin/wizard/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to reset wizard');
      }

      // Navigate to wizard
      router.push('/admin/wizard');
    } catch (error) {
      console.error('Error resetting wizard:', error);
      // Still navigate even if reset fails
      router.push('/admin/wizard');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="flex items-center w-full p-4 border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hover:border-purple-400 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex-shrink-0">
        <svg
          className="h-6 w-6 text-purple-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-medium text-purple-900">
          {isLoading ? 'Loading...' : t('setupWizard')}
        </h3>
        <p className="mt-1 text-sm text-purple-700">{t('setupWizardSubtitle')}</p>
      </div>
    </button>
  );
}
