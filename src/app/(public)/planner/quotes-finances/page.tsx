import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import PrivateHeader from '@/components/PrivateHeader';
import { requireRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { getTranslations } from '@/lib/i18n/server';
import { QuotesFinancesPage } from '@/components/planner/quotes-finances/QuotesFinancesPage';
import { parseCookieFilter, computeDateRange, STATS_FILTER_COOKIE } from '@/lib/stats-filter';

async function getFinancialSummary(plannerId: string, startDate?: Date, endDate?: Date) {
  try {
    const createdAtFilter =
      startDate || endDate
        ? { created_at: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } }
        : {};

    const [quotes, invoices] = await Promise.all([
      prisma.quote.findMany({
        where: { planner_id: plannerId, ...createdAtFilter },
        select: { status: true, currency: true },
      }),
      prisma.invoice.findMany({
        where: { planner_id: plannerId, ...createdAtFilter },
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
  const { t } = await getTranslations();
  return { title: `Nupci \u2013 ${t('planner.quotesFinances.page.title')}` };
}

export default async function QuotesFinancesServerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  let user;
  try {
    user = await requireRole('planner');
  } catch {
    redirect('/api/auth/signin');
  }

  const { t } = await getTranslations();
  const { tab } = await searchParams;

  const cookieStore = await cookies();
  const filterCookie = cookieStore.get(STATS_FILTER_COOKIE)?.value;
  const initialFilter = parseCookieFilter(filterCookie ? decodeURIComponent(filterCookie) : null);
  const { start, end } = computeDateRange(initialFilter);

  const summary = user.planner_id
    ? await getFinancialSummary(user.planner_id, start, end)
    : null;

  return (
    <div className="min-h-screen">
      <PrivateHeader />

      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="text-2xl font-bold text-gray-900 font-playfair">{t('planner.quotesFinances.page.title')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{t('planner.quotesFinances.page.subtitle')}</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QuotesFinancesPage
          summary={summary ?? undefined}
          initialTab={tab}
          initialFilter={initialFilter}
        />
      </main>
    </div>
  );
}
