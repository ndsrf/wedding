import { notFound } from 'next/navigation';
import Image from 'next/image';
import { prisma } from '@/lib/db/prisma';
import { SchedulePageContent } from '@/components/shared/SchedulePageContent';
import { formatDateByLanguage } from '@/lib/date-formatter';
import { getLanguageFromRequest } from '@/lib/i18n/server';

type Props = { params: Promise<{ token: string }> };

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  if (!token || !TOKEN_RE.test(token)) return { title: 'Cronograma' };
  const wedding = await prisma.wedding.findFirst({
    where: { OR: [{ admin_schedule_token: token }, { planner_schedule_token: token }] },
    select: { couple_names: true },
  });
  return { title: wedding ? `Cronograma · ${wedding.couple_names}` : 'Cronograma' };
}

export default async function PublicSchedulePage({ params }: Props) {
  const { token } = await params;

  // Reject empty/malformed tokens before querying — an empty token in OR: [{}, {}]
  // would match any wedding and leak data.
  if (!token || !TOKEN_RE.test(token)) notFound();

  const wedding = await prisma.wedding.findFirst({
    where: {
      OR: [
        { admin_schedule_token: token },
        { planner_schedule_token: token },
      ],
    },
    select: {
      couple_names: true,
      wedding_date: true,
      admin_schedule_token: true,
      planner_schedule_token: true,
      planner: { select: { name: true, logo_url: true } },
    },
  });

  if (!wedding) notFound();

  const isPlanner = wedding.planner_schedule_token === token;

  const language = await getLanguageFromRequest();
  const weddingDate = wedding.wedding_date
    ? formatDateByLanguage(wedding.wedding_date, language)
    : undefined;

  return (
    <SchedulePageContent
      apiPaths={{
        schedule: `/api/schedule/${token}`,
        schedulePdf: '',
      }}
      isPlanner={isPlanner}
      readOnly={true}
      coupleNames={wedding.couple_names}
      weddingDate={weddingDate}
      header={
        <header className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex items-center gap-4">
              {wedding.planner.logo_url ? (
                <Image
                  src={wedding.planner.logo_url}
                  alt={wedding.planner.name}
                  width={48}
                  height={48}
                  className="h-12 w-auto object-contain flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {wedding.planner.name}
                </p>
                <h1 className="text-xl font-bold text-gray-900 font-playfair leading-tight">
                  {wedding.couple_names}
                </h1>
                {weddingDate && (
                  <p className="text-sm text-gray-500 mt-0.5 capitalize">{weddingDate}</p>
                )}
              </div>
            </div>
          </div>
        </header>
      }
    />
  );
}
