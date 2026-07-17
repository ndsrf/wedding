/**
 * Wedding Documents Helper
 *
 * Shared logic for resolving contract, invoice, quote, and payment schedule
 * data from a wedding record. Used by both the admin account page and the
 * planner's admin profile page/API.
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { resolvePaymentScheduleDate } from './wedding-utils';

// ── Serialised output types (dates as ISO strings, amounts as numbers) ─────

export interface ContractData {
  id: string;
  title: string;
  status: string;
  pdf_url: string | null;
  signed_pdf_url: string | null;
  signed_at: string | null;
}

export interface QuoteData {
  id: string;
  status: string;
  total: number;
  currency: string;
}

export interface InvoiceData {
  id: string;
  invoice_number: string;
  type: string;
  status: string;
  total: number;
  amount_paid: number;
  pdf_url: string | null;
  issued_at: string | null;
  due_date: string | null;
}

export interface PaymentScheduleItem {
  id: string;
  order: number;
  description: string;
  amount_type: string;
  amount_value: number;
  due_date: string | null;
}

export interface WeddingDocumentsResult {
  contract: ContractData | null;
  quote: QuoteData | null;
  invoices: InvoiceData[];
  paymentSchedule: PaymentScheduleItem[];
}

// ── Prisma select ───────────────────────────────────────────────────────────

/**
 * Include this in any wedding Prisma query that will call resolveWeddingDocuments.
 * Placed under `contract: { select: WEDDING_CONTRACT_SELECT }`.
 */
export const WEDDING_CONTRACT_SELECT = {
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
    select: {
      id: true, invoice_number: true, type: true, status: true,
      total: true, amount_paid: true, pdf_url: true, issued_at: true, due_date: true,
    },
    orderBy: { issued_at: 'desc' as const },
  },
  payment_schedule_items: {
    select: {
      id: true, order: true, description: true, amount_type: true,
      amount_value: true, reference_date: true, days_offset: true, fixed_date: true,
    },
    orderBy: { order: 'asc' as const },
  },
} satisfies Prisma.ContractSelect;

type ContractForDocuments = Prisma.ContractGetPayload<{
  select: typeof WEDDING_CONTRACT_SELECT;
}>;

export interface WeddingForDocuments {
  wedding_date: Date;
  customer_id: string | null;
  contract: ContractForDocuments | null;
}

// ── Helper ──────────────────────────────────────────────────────────────────

/**
 * Resolve contract, invoice, quote, and payment schedule data for a wedding.
 *
 * Primary path: the wedding has a direct contract link.
 * Fallback path: no contract link but has a customer — fetch all docs by customer.
 *
 * The caller must include `contract: { select: WEDDING_CONTRACT_SELECT }` in
 * their Prisma wedding query and pass the result here.
 */
export async function resolveWeddingDocuments(
  wedding: WeddingForDocuments,
): Promise<WeddingDocumentsResult> {
  let contract: ContractData | null = null;
  let quote: QuoteData | null = null;
  let invoices: InvoiceData[] = [];
  let paymentSchedule: PaymentScheduleItem[] = [];

  if (wedding.contract) {
    const c = wedding.contract;
    contract = {
      id: c.id, title: c.title, status: c.status,
      pdf_url: c.pdf_url, signed_pdf_url: c.signed_pdf_url,
      signed_at: c.signed_at?.toISOString() ?? null,
    };
    if (c.quote) {
      quote = { id: c.quote.id, status: c.quote.status, total: Number(c.quote.total), currency: c.quote.currency };
    }
    invoices = c.invoices.map((inv) => ({
      id: inv.id, invoice_number: inv.invoice_number, type: inv.type, status: inv.status,
      total: Number(inv.total), amount_paid: Number(inv.amount_paid),
      pdf_url: inv.pdf_url,
      issued_at: inv.issued_at?.toISOString() ?? null,
      due_date: inv.due_date?.toISOString() ?? null,
    }));
    paymentSchedule = c.payment_schedule_items.map((item) => ({
      id: item.id, order: item.order, description: item.description,
      amount_type: item.amount_type, amount_value: Number(item.amount_value),
      due_date: resolvePaymentScheduleDate(
        item, wedding.wedding_date,
        c.payment_schedule_wedding_date, c.payment_schedule_signing_date,
      )?.toISOString() ?? null,
    }));
  } else if (wedding.customer_id) {
    const [customerContracts, customerInvoices, customerQuotes] = await Promise.all([
      prisma.contract.findMany({
        where: { customer_id: wedding.customer_id },
        select: {
          id: true, title: true, status: true, pdf_url: true,
          signed_pdf_url: true, signed_at: true,
          payment_schedule_signing_date: true, payment_schedule_wedding_date: true,
          payment_schedule_items: {
            select: {
              id: true, order: true, description: true, amount_type: true,
              amount_value: true, reference_date: true, days_offset: true, fixed_date: true,
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.invoice.findMany({
        where: { customer_id: wedding.customer_id },
        select: {
          id: true, invoice_number: true, type: true, status: true,
          total: true, amount_paid: true, pdf_url: true, issued_at: true, due_date: true,
        },
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
      contract = {
        id: latestContract.id, title: latestContract.title, status: latestContract.status,
        pdf_url: latestContract.pdf_url, signed_pdf_url: latestContract.signed_pdf_url,
        signed_at: latestContract.signed_at?.toISOString() ?? null,
      };
      paymentSchedule = latestContract.payment_schedule_items.map((item) => ({
        id: item.id, order: item.order, description: item.description,
        amount_type: item.amount_type, amount_value: Number(item.amount_value),
        due_date: resolvePaymentScheduleDate(
          item, wedding.wedding_date,
          latestContract.payment_schedule_wedding_date, latestContract.payment_schedule_signing_date,
        )?.toISOString() ?? null,
      }));
    }
    if (customerQuotes[0]) {
      const q = customerQuotes[0];
      quote = { id: q.id, status: q.status, total: Number(q.total), currency: q.currency };
    }
    invoices = customerInvoices.map((inv) => ({
      id: inv.id, invoice_number: inv.invoice_number, type: inv.type, status: inv.status,
      total: Number(inv.total), amount_paid: Number(inv.amount_paid),
      pdf_url: inv.pdf_url,
      issued_at: inv.issued_at?.toISOString() ?? null,
      due_date: inv.due_date?.toISOString() ?? null,
    }));
  }

  return { contract, quote, invoices, paymentSchedule };
}
