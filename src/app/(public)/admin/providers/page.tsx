import { requireRole } from '@/lib/auth/middleware';
import { ProvidersPageContent } from '@/components/shared/ProvidersPageContent';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from '@/lib/i18n/server';
import { prisma } from '@/lib/db/prisma';

export async function generateMetadata() {
  try {
    const [{ t }, user] = await Promise.all([
      getTranslations(),
      requireRole('wedding_admin').catch(() => null),
    ]);
    if (!user?.wedding_id) return { title: `Nupci - ${t('admin.dashboard.providers')}` };
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { couple_names: true },
    });
    const coupleNames = wedding?.couple_names;
    return {
      title: coupleNames ? `Nupci - ${coupleNames} - ${t('admin.dashboard.providers')}` : `Nupci - ${t('admin.dashboard.providers')}`,
    };
  } catch {
    return { title: 'Nupci' };
  }
}

export default async function AdminWeddingProvidersPage() {
  const { t } = await getTranslations();
  let user;
  try {
    user = await requireRole('wedding_admin');
  } catch {
    redirect('/api/auth/signin');
  }

  if (!user.wedding_id) {
    return <div>{t('admin.providers.noWeddingAssigned')}</div>;
  }

  return (
    <ProvidersPageContent
      weddingId={user.wedding_id}
      isPlanner={false}
      header={
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard.providers')}</h1>
              </div>
            </div>
          </div>
        </header>
      }
    />
  );
}