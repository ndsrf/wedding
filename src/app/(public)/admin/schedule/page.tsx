/**
 * Admin - Schedule Page (thin wrapper)
 *
 * Resolves admin context and delegates all rendering to the shared
 * SchedulePageContent component.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { SchedulePageContent } from '@/components/shared/SchedulePageContent';
import PrivateHeader from '@/components/PrivateHeader';
import { formatDateByLanguage } from '@/lib/date-formatter';
import { getLanguageFromRequest } from '@/lib/i18n/server';

export async function generateMetadata() {
  return { title: 'Nupci - Cronograma' };
}

export default async function AdminSchedulePage() {
  let user;
  try {
    user = await requireRole('wedding_admin');
  } catch {
    redirect('/api/auth/signin');
  }

  if (!user!.wedding_id) redirect('/admin');

  const wedding = await prisma.wedding.findUnique({
    where: { id: user!.wedding_id! },
    select: { couple_names: true, wedding_date: true },
  });

  const language = await getLanguageFromRequest();
  const weddingDateStr = wedding?.wedding_date
    ? formatDateByLanguage(wedding.wedding_date, language)
    : undefined;

  return (
    <SchedulePageContent
      apiPaths={{
        schedule: '/api/admin/schedule',
        schedulePdf: '/api/admin/schedule/pdf',
        providersUrl: `/api/weddings/${user!.wedding_id!}/providers`,
      }}
      isPlanner={false}
      coupleNames={wedding?.couple_names ?? undefined}
      weddingDate={weddingDateStr}
      header={
        <div>
          <PrivateHeader backUrl="/admin" />
          <div className="bg-white shadow-sm border-b border-gray-100">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Cronograma de Boda</h1>
                  {weddingDateStr && (
                    <p className="text-sm text-gray-500 mt-0.5">{weddingDateStr}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}
