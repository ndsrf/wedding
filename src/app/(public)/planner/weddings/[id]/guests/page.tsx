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

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { buildNupciTitle, useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCoupleNames } from '@/hooks/useCoupleNames';
import { GuestsPageContent } from '@/components/shared/GuestsPageContent';
import PrivateHeader from '@/components/PrivateHeader';

export default function GuestsPage() {
  const t = useTranslations();
  const params = useParams();
  const weddingId = params.id as string;
  const weddingName = useCoupleNames(weddingId);
  useDocumentTitle(buildNupciTitle(t('admin.guests.title'), weddingName));
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
        <PrivateHeader
          title={t('admin.guests.title')}
          subtitle={weddingName}
          backUrl={`/planner/weddings/${weddingId}`}
        />
      }
    />
  );
}
