import { redirect } from 'next/navigation';
import { getTranslations } from '@/lib/i18n/server';
import PrivateHeader from '@/components/PrivateHeader';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { CompanyProfilePage } from '@/components/planner/CompanyProfilePage';

export async function generateMetadata() {
  const { t } = await getTranslations();
  return { title: `Nupci – ${t('planner.companyProfile.pageTitle')}` };
}

export default async function CompanyProfileServerPage() {
  let user;
  try {
    user = await requireRole('planner');
  } catch {
    redirect('/api/auth/signin');
  }

  if (!user.planner_id) redirect('/api/auth/signin');

  const planner = await prisma.weddingPlanner.findUnique({
    where: { id: user.planner_id },
    select: {
      id: true,
      name: true,
      email: true,
      legal_name: true,
      vat_number: true,
      address: true,
      phone: true,
      whatsapp: true,
      instagram: true,
      website: true,
      company_email: true,
      logo_url: true,
      signature_url: true,
    },
  });

  if (!planner) redirect('/api/auth/signin');

  const { t } = await getTranslations();

  return (
    <div className="min-h-screen">
      <PrivateHeader />

      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="text-2xl font-bold text-gray-900 font-playfair">{t('planner.companyProfile.pageTitle')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {t('planner.companyProfile.pageSubtitle')}
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CompanyProfilePage initialProfile={planner} />
      </main>
    </div>
  );
}
