/**
 * Wedding Planner - Guest Management Page
 *
 * Thin wrapper that resolves planner-specific context (wedding ID from URL,
 * API paths) and delegates all rendering to the shared GuestsPageContent
 * component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCoupleNames } from '@/hooks/useCoupleNames';
import { GuestsPageContent } from '@/components/shared/GuestsPageContent';

export default function GuestsPage() {
  const t = useTranslations();
  const params = useParams();
  const weddingId = params.id as string;
  const weddingName = useCoupleNames(weddingId);
  useDocumentTitle(weddingName ? `Nupci - ${weddingName} - ${t('admin.guests.title')}` : `Nupci - ${t('admin.guests.title')}`);
  const plannerBase = `/api/planner/weddings/${weddingId}`;

  return (
    <GuestsPageContent
      apiPaths={{
        apiBase: plannerBase,
        guests: `${plannerBase}/guests`,
        guestAdditions: `${plannerBase}/guest-additions`,
        wedding: plannerBase,
        admins: `${plannerBase}/admins`,
        reminders: `${plannerBase}/reminders`,
        saveTheDate: `${plannerBase}/save-the-date`,
      }}
      isReadOnly={false}
      guestAdditionsOptional
      header={
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Link href={`/planner/weddings/${weddingId}`} className="text-gray-600 hover:text-gray-900 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{t('admin.guests.title')}</h1>
            </div>
          </div>
        </header>
      }
    />
  );
}
