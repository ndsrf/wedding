/**
 * Wedding Admin - Mi Cuenta Page
 *
 * - Edit name and phone
 * - Documents: contract path if wedding.contract_id is set;
 *   otherwise customer path if wedding.customer_id is set
 * - Pending payments and contract payment schedule
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { getTranslations } from '@/lib/i18n/server';
import { WEDDING_CONTRACT_SELECT, resolveWeddingDocuments } from '@/lib/wedding-documents';
import PrivateHeader from '@/components/PrivateHeader';
import AdminAccountClient from '@/components/admin/AdminAccountClient';
import AdminApiKeySection from '@/components/admin/AdminApiKeySection';

export async function generateMetadata() {
  const { t } = await getTranslations();
  return { title: `Nupci - ${t('admin.account.title')}` };
}

export default async function AdminAccountPage() {
  let user;
  try {
    user = await requireRole('wedding_admin');
  } catch {
    redirect('/api/auth/signin');
  }

  if (!user.wedding_id) redirect('/admin');

  // Determine base URL for MCP endpoint
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? 'http';
  const mcpUrl = `${proto}://${host}/mcp`;

  const [{ t }, admin, wedding, existingApiKey] = await Promise.all([
    getTranslations(),
    prisma.weddingAdmin.findFirst({
      where: { id: user.id },
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: {
        id: true,
        wedding_date: true,
        customer_id: true,
        planner_id: true,
        contract: { select: WEDDING_CONTRACT_SELECT },
      },
    }),
    prisma.weddingApiKey.findFirst({
      where: { wedding_id: user.wedding_id, role: 'wedding_admin' },
      select: { id: true, name: true, expires_at: true, last_used_at: true },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  if (!admin || !wedding) redirect('/admin');

  // Fetch planner's payment info (bank account, Bizum, Revolut)
  const planner = await prisma.weddingPlanner.findUnique({
    where: { id: wedding.planner_id },
    select: { phone: true, bank_account: true, accepts_bizum: true, accepts_revolut: true },
  });

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
      <PrivateHeader backUrl="/admin" />

      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="text-2xl font-bold text-gray-900 font-playfair">{t('admin.account.title')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{t('admin.account.subtitle')}</p>
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
        />
        <AdminApiKeySection
          existingKey={existingApiKey ? {
            id: existingApiKey.id,
            name: existingApiKey.name,
            expires_at: existingApiKey.expires_at?.toISOString() ?? null,
            last_used_at: existingApiKey.last_used_at?.toISOString() ?? null,
          } : null}
          mcpUrl={mcpUrl}
        />
      </main>
    </div>
  );
}
