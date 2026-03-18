import { redirect } from 'next/navigation';
import PrivateHeader from '@/components/PrivateHeader';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { QuotesFinancesPage } from '@/components/planner/quotes-finances/QuotesFinancesPage';

async function getFinancialSummary(plannerId: string) {
  try {
    const [quotes, invoices] = await Promise.all([
      prisma.quote.findMany({
        where: { planner_id: plannerId },
        select: { status: true, currency: true },
      }),
      prisma.invoice.findMany({
        where: { planner_id: plannerId },
        select: { total: true, amount_paid: true, currency: true },
      }),
    ]);

    const currency = quotes[0]?.currency ?? invoices[0]?.currency ?? 'EUR';
    const total_quotes = quotes.length;
    const accepted_quotes = quotes.filter((q) => q.status === 'ACCEPTED').length;
    const invoiced_total = invoices.reduce((sum, i) => sum + Number(i.total), 0);
    const amount_received = invoices.reduce((sum, i) => sum + Number(i.amount_paid), 0);

    return { total_quotes, accepted_quotes, invoiced_total, amount_received, currency };
  } catch {
    return null;
  }
}

export async function generateMetadata() {
  return { title: 'Nupci – Quotes & Finances' };
}

export default async function QuotesFinancesServerPage() {
  let user;
  try {
    user = await requireRole('planner');
  } catch {
    redirect('/api/auth/signin');
  }

  const summary = user.planner_id ? await getFinancialSummary(user.planner_id) : null;

  return (
    <div className="min-h-screen">
      <PrivateHeader />

      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="text-2xl font-bold text-gray-900 font-playfair">Quotes &amp; Finances</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage your quotes, contracts, invoices and track payments</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QuotesFinancesPage summary={summary ?? undefined} />
      </main>
    </div>
  );
}
