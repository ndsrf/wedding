import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import PrivateHeader from '@/components/PrivateHeader';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { AlertSettingsPage } from '@/components/planner/AlertSettingsPage';

export async function generateMetadata() {
  const t = await getTranslations('planner.alertSettings');
  return { title: `Nupci – ${t('title')}` };
}

export default async function AlertSettingsServerPage() {
  let user;
  try {
    user = await requireRole('planner');
  } catch {
    redirect('/api/auth/signin');
  }

  if (!user.planner_id) redirect('/api/auth/signin');

  const planner = await prisma.weddingPlanner.findUnique({
    where: { id: user.planner_id },
    select: { preferred_language: true },
  });

  if (!planner) redirect('/api/auth/signin');

  const t = await getTranslations('planner.alertSettings');

  return (
    <div className="min-h-screen bg-gray-50">
      <PrivateHeader />

      {/* Page header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/planner"
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Back"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 font-playfair">{t('title')}</h1>
          </div>
          <p className="ml-8 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AlertSettingsPage plannerLanguage={planner.preferred_language} />
      </main>
    </div>
  );
}
