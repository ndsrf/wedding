'use server';

import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { buildPrismaDateFilter } from '@/lib/stats-filter';

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

    const dateFilter = buildPrismaDateFilter(startDate, endDate);

    const [quotes, invoices] = await Promise.all([
      prisma.quote.findMany({
        where: { planner_id: user.planner_id, ...dateFilter },
        select: { status: true, currency: true },
      }),
      prisma.invoice.findMany({
        where: {
          planner_id: user.planner_id,
          ...dateFilter,
          // Exclude proformas that have already been converted to a definitive invoice
          // to prevent double-counting the same transaction.
          OR: [
            { type: 'INVOICE' },
            { type: 'PROFORMA', derived_invoice: null },
          ],
        },
        select: { total: true, amount_paid: true, currency: true },
      }),
    ]);

    // Use the planner's primary currency (first quote, then first invoice, fallback EUR).
    // Filter invoices to that currency to avoid summing across different currencies.
    const currency = quotes[0]?.currency ?? invoices[0]?.currency ?? 'EUR';
    const sameCurrencyInvoices = invoices.filter((i) => i.currency === currency);

    const total_quotes = quotes.length;
    const accepted_quotes = quotes.filter((q) => q.status === 'ACCEPTED').length;
    // Use integer arithmetic (cents) to avoid floating-point drift.
    const invoiced_total =
      sameCurrencyInvoices.reduce((sum, i) => sum + Math.round(Number(i.total) * 100), 0) / 100;
    const amount_received =
      sameCurrencyInvoices.reduce((sum, i) => sum + Math.round(Number(i.amount_paid) * 100), 0) / 100;

    return { total_quotes, accepted_quotes, invoiced_total, amount_received, currency };
  } catch {
    return null;
  }
}
