/**
 * Planner - Wedding Admin Profile Page
 *
 * Shows the same profile view an admin sees at /admin/account,
 * but accessible by the planner for any admin in their wedding.
 */

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { resolvePaymentScheduleDate } from '@/lib/wedding-utils';
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
      contract_id: true,
      customer_id: true,
      planner_id: true,
      contract: {
        select: {
          id: true,
          title: true,
          status: true,
          pdf_url: true,
          signed_pdf_url: true,
          signed_at: true,
          payment_schedule_signing_date: true,
          payment_schedule_wedding_date: true,
          quote: { select: { id: true, status: true, total: true, currency: true } },
          invoices: {
            select: { id: true, invoice_number: true, type: true, status: true, total: true, amount_paid: true, pdf_url: true, issued_at: true, due_date: true },
            orderBy: { issued_at: 'desc' },
          },
          payment_schedule_items: {
            select: { id: true, order: true, description: true, amount_type: true, amount_value: true, reference_date: true, days_offset: true, fixed_date: true },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!wedding || wedding.planner_id !== user.planner_id) redirect(`/planner/weddings`);

  const admin = await prisma.weddingAdmin.findFirst({
    where: { id: adminId, wedding_id: weddingId },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (!admin) redirect(`/planner/weddings/${weddingId}`);

  const { t } = await getTranslations();

  // Planner payment methods
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

  // Resolve contract/invoice/schedule (same logic as /admin/account)
  let contractData: {
    id: string; title: string; status: string;
    pdf_url: string | null; signed_pdf_url: string | null; signed_at: string | null;
  } | null = null;
  let quoteData: { id: string; status: string; total: number; currency: string } | null = null;
  let invoiceList: { id: string; invoice_number: string; type: string; status: string; total: number; amount_paid: number; pdf_url: string | null; issued_at: string | null; due_date: string | null }[] = [];
  let scheduleList: { id: string; order: number; description: string; amount_type: string; amount_value: number; due_date: string | null }[] = [];

  if (wedding.contract) {
    const c = wedding.contract;
    contractData = { id: c.id, title: c.title, status: c.status, pdf_url: c.pdf_url, signed_pdf_url: c.signed_pdf_url, signed_at: c.signed_at?.toISOString() ?? null };
    if (c.quote) quoteData = { id: c.quote.id, status: c.quote.status, total: Number(c.quote.total), currency: c.quote.currency };
    invoiceList = c.invoices.map((inv) => ({
      id: inv.id, invoice_number: inv.invoice_number, type: inv.type, status: inv.status,
      total: Number(inv.total), amount_paid: Number(inv.amount_paid),
      pdf_url: inv.pdf_url, issued_at: inv.issued_at?.toISOString() ?? null, due_date: inv.due_date?.toISOString() ?? null,
    }));
    scheduleList = c.payment_schedule_items.map((item) => ({
      id: item.id, order: item.order, description: item.description,
      amount_type: item.amount_type, amount_value: Number(item.amount_value),
      due_date: resolvePaymentScheduleDate(item, wedding.wedding_date, c.payment_schedule_wedding_date, c.payment_schedule_signing_date)?.toISOString() ?? null,
    }));
  } else if (wedding.customer_id) {
    const [customerContracts, customerInvoices, customerQuotes] = await Promise.all([
      prisma.contract.findMany({
        where: { customer_id: wedding.customer_id },
        select: {
          id: true, title: true, status: true, pdf_url: true, signed_pdf_url: true, signed_at: true,
          payment_schedule_signing_date: true, payment_schedule_wedding_date: true,
          payment_schedule_items: {
            select: { id: true, order: true, description: true, amount_type: true, amount_value: true, reference_date: true, days_offset: true, fixed_date: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { customer_id: wedding.customer_id },
        select: { id: true, invoice_number: true, type: true, status: true, total: true, amount_paid: true, pdf_url: true, issued_at: true, due_date: true },
        orderBy: { issued_at: 'desc' },
      }),
      prisma.quote.findMany({
        where: { customer_id: wedding.customer_id },
        select: { id: true, status: true, total: true, currency: true },
        orderBy: { created_at: 'desc' },
        take: 1,
      }),
    ]);

    const latestContract = customerContracts[0] ?? null;
    if (latestContract) {
      contractData = { id: latestContract.id, title: latestContract.title, status: latestContract.status, pdf_url: latestContract.pdf_url, signed_pdf_url: latestContract.signed_pdf_url, signed_at: latestContract.signed_at?.toISOString() ?? null };
      scheduleList = latestContract.payment_schedule_items.map((item) => ({
        id: item.id, order: item.order, description: item.description,
        amount_type: item.amount_type, amount_value: Number(item.amount_value),
        due_date: resolvePaymentScheduleDate(item, wedding.wedding_date, latestContract.payment_schedule_wedding_date, latestContract.payment_schedule_signing_date)?.toISOString() ?? null,
      }));
    }
    if (customerQuotes[0]) {
      const q = customerQuotes[0];
      quoteData = { id: q.id, status: q.status, total: Number(q.total), currency: q.currency };
    }
    invoiceList = customerInvoices.map((inv) => ({
      id: inv.id, invoice_number: inv.invoice_number, type: inv.type, status: inv.status,
      total: Number(inv.total), amount_paid: Number(inv.amount_paid),
      pdf_url: inv.pdf_url, issued_at: inv.issued_at?.toISOString() ?? null, due_date: inv.due_date?.toISOString() ?? null,
    }));
  }

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
