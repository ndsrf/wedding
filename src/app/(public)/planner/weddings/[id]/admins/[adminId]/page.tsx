/**
 * Planner - Wedding Admin Profile Page
 *
 * Shows the same profile view an admin sees at /admin/account,
 * but accessible by the planner for any admin in their wedding.
 */

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { WEDDING_CONTRACT_SELECT, resolveWeddingDocuments } from '@/lib/wedding-documents';
import { getTranslations } from '@/lib/i18n/server';
import PrivateHeader from '@/components/PrivateHeader';
import AdminAccountClient from '@/components/admin/AdminAccountClient';

export async function generateMetadata({ params }: { params: Promise<{ id: string; adminId: string }> }) {
  const { t } = await getTranslations();
  const { id: weddingId, adminId } = await params;
  const admin = await prisma.weddingAdmin.findFirst({
    where: { id: adminId, wedding_id: weddingId },
    select: { name: true },
  });
  return { title: admin ? `Nupci - ${admin.name}` : `Nupci - ${t('admin.account.title')}` };
}

export default async function PlannerAdminProfilePage({
  params,
}: {
  params: Promise<{ id: string; adminId: string }>;
}) {
  let user;
  try {
    user = await requireRole('planner');
  } catch {
    redirect('/api/auth/signin');
  }

  const { id: weddingId, adminId } = await params;

  // Verify planner owns this wedding
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: {
      id: true,
      couple_names: true,
      wedding_date: true,
      customer_id: true,
      planner_id: true,
      contract: { select: WEDDING_CONTRACT_SELECT },
    },
  });

  if (!wedding || wedding.planner_id !== user.planner_id) redirect(`/planner/weddings`);

  const [admin, planner, { t }] = await Promise.all([
    prisma.weddingAdmin.findFirst({
      where: { id: adminId, wedding_id: weddingId },
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.weddingPlanner.findUnique({
      where: { id: wedding.planner_id },
      select: { phone: true, bank_account: true, accepts_bizum: true, accepts_revolut: true },
    }),
    getTranslations(),
  ]);

  if (!admin) redirect(`/planner/weddings/${weddingId}`);

  const plannerPayment = {
    bank_account: planner?.bank_account ?? null,
    accepts_bizum: planner?.accepts_bizum ?? false,
    accepts_revolut: planner?.accepts_revolut ?? false,
    phone: planner?.phone ?? null,
  };

  const { contract: contractData, quote: quoteData, invoices: invoiceList, paymentSchedule: scheduleList } =
    await resolveWeddingDocuments(wedding);

  return (
    <div className="min-h-screen">
      <PrivateHeader backUrl={`/planner/weddings/${weddingId}`} />

      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="text-2xl font-bold text-gray-900 font-playfair">{t('admin.account.title')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{wedding.couple_names}</p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <AdminAccountClient
          admin={admin}
          contract={contractData}
          quote={quoteData}
          invoices={invoiceList}
          paymentSchedule={scheduleList}
          plannerPayment={plannerPayment}
          saveUrl={`/api/planner/weddings/${weddingId}/admins/${adminId}`}
        />
      </main>
    </div>
  );
}
