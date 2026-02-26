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
      className="group flex items-center w-full gap-4 bg-white rounded-xl border border-purple-200 shadow-sm p-4 hover:shadow-md hover:border-purple-400 hover:bg-purple-50/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
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
      <div className="text-left">
        <h3 className="text-sm font-semibold text-purple-900">
          {isLoading ? 'Loading...' : t('setupWizard')}
        </h3>
        <p className="mt-0.5 text-xs text-purple-700">{t('setupWizardSubtitle')}</p>
      </div>
    </button>
  );
}
