/**
 * Wedding Admin - Mi Cuenta Page
 *
 * Allows wedding admins to:
 * - Edit their name and phone number
 * - View their wedding documents (contract, quote, invoices)
 * - See pending payment schedule
 */

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import PrivateHeader from '@/components/PrivateHeader';
import AdminAccountClient from '@/components/admin/AdminAccountClient';

export async function generateMetadata() {
  return { title: 'Nupci - Mi cuenta' };
}

export default async function AdminAccountPage() {
  let user;
  try {
    user = await requireRole('wedding_admin');
  } catch {
    redirect('/api/auth/signin');
  }

  if (!user.wedding_id) {
    redirect('/admin');
  }

  // Fetch admin profile and wedding documents in parallel
  const [admin, wedding] = await Promise.all([
    prisma.weddingAdmin.findFirst({
      where: { id: user.id },
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.wedding.findUnique({
      where: { id: user.wedding_id },
      select: {
        id: true,
        wedding_date: true,
        contract_id: true,
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
            quote: {
              select: {
                id: true,
                status: true,
                total: true,
                currency: true,
              },
            },
            invoices: {
              select: {
                id: true,
                invoice_number: true,
                type: true,
                status: true,
                total: true,
                amount_paid: true,
                pdf_url: true,
                issued_at: true,
                due_date: true,
              },
              orderBy: { issued_at: 'desc' },
            },
            payment_schedule_items: {
              select: {
                id: true,
                order: true,
                description: true,
                amount_type: true,
                amount_value: true,
                reference_date: true,
                days_offset: true,
                fixed_date: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    }),
  ]);

  if (!admin || !wedding) {
    redirect('/admin');
  }

  const contract = wedding.contract;

  // Resolve due date for each payment schedule item
  const resolveDate = (item: {
    reference_date: string;
    days_offset: number;
    fixed_date: Date | null;
  }): string | null => {
    if (item.reference_date === 'FIXED_DATE') {
      return item.fixed_date?.toISOString() ?? null;
    }
    const base =
      item.reference_date === 'WEDDING_DATE'
        ? contract?.payment_schedule_wedding_date ?? wedding.wedding_date
        : contract?.payment_schedule_signing_date ?? null;
    if (!base) return null;
    const d = new Date(base);
    d.setDate(d.getDate() + item.days_offset);
    return d.toISOString();
  };

  const paymentSchedule =
    contract?.payment_schedule_items.map((item) => ({
      id: item.id,
      order: item.order,
      description: item.description,
      amount_type: item.amount_type,
      amount_value: Number(item.amount_value),
      due_date: resolveDate(item as { reference_date: string; days_offset: number; fixed_date: Date | null }),
    })) ?? [];

  const invoices =
    contract?.invoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      type: inv.type,
      status: inv.status,
      total: Number(inv.total),
      amount_paid: Number(inv.amount_paid),
      pdf_url: inv.pdf_url,
      issued_at: inv.issued_at?.toISOString() ?? null,
      due_date: inv.due_date?.toISOString() ?? null,
    })) ?? [];

  const quote = contract?.quote
    ? {
        id: contract.quote.id,
        status: contract.quote.status,
        total: Number(contract.quote.total),
        currency: contract.quote.currency,
      }
    : null;

  const contractData = contract
    ? {
        id: contract.id,
        title: contract.title,
        status: contract.status,
        pdf_url: contract.pdf_url,
        signed_pdf_url: contract.signed_pdf_url,
        signed_at: contract.signed_at?.toISOString() ?? null,
      }
    : null;

  return (
    <div className="min-h-screen">
      <PrivateHeader backUrl="/admin" />

      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="text-2xl font-bold text-gray-900 font-playfair">Mi cuenta</h1>
          <p className="mt-0.5 text-sm text-gray-500">Gestiona tu perfil y consulta tus documentos</p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminAccountClient
          admin={admin}
          contract={contractData}
          quote={quote}
          invoices={invoices}
          paymentSchedule={paymentSchedule}
        />
      </main>
    </div>
  );
}
