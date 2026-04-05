'use server';

import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';

export interface FinancialSummary {
  total_quotes: number;
  accepted_quotes: number;
  invoiced_total: number;
  amount_received: number;
  currency: string;
}

export async function getFilteredSummary(
  startDate?: Date,
  endDate?: Date
): Promise<FinancialSummary | null> {
  try {
    const user = await requireRole('planner');
    if (!user.planner_id) return null;

    const createdAtFilter =
      startDate || endDate
        ? { created_at: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } }
        : {};

    const [quotes, invoices] = await Promise.all([
      prisma.quote.findMany({
        where: { planner_id: user.planner_id, ...createdAtFilter },
        select: { status: true, currency: true },
      }),
      prisma.invoice.findMany({
        where: { planner_id: user.planner_id, ...createdAtFilter },
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
