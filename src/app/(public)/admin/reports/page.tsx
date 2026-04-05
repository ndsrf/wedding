/**
 * Wedding Admin — Reports Page
 */

import Link from 'next/link';
import { getTranslations } from '@/lib/i18n/server';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { ReportsPageContent } from '@/components/shared/ReportsPageContent';

export async function generateMetadata() {
  try {
    const [{ t }, user] = await Promise.all([
      getTranslations(),
      requireRole('wedding_admin').catch(() => null),
    ]);
    if (!user?.wedding_id) return { title: `Nupci - ${t('admin.reports.title')}` };
    const wedding = await prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: { couple_names: true },
    });
    const coupleNames = wedding?.couple_names;
    return {
      title: coupleNames
        ? `Nupci - ${coupleNames} - ${t('admin.reports.title')}`
        : `Nupci - ${t('admin.reports.title')}`,
    };
  } catch {
    return { title: 'Nupci' };
  }
}

export default async function ReportsPage() {
  const { t } = await getTranslations();

  const header = (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← {t('common.buttons.back')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.reports.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('admin.reports.subtitle')}</p>
      </div>
    </header>
  );

  return <ReportsPageContent apiBasePath="/api/admin/reports" header={header} />;
}
