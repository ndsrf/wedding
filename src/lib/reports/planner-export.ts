/**
 * Planner-Level Reports Export Service
 *
 * Generates cross-wedding and financial reports for wedding planners.
 * All functions are scoped by planner_id (not wedding_id).
 *
 * Reports:
 *  - Weddings Summary: all managed weddings with key metrics
 *  - Guests Summary: total guest counts grouped by wedding
 *  - Provider Payments: vendor payments across all weddings
 *  - Revenue Summary: quotes and invoices financial overview
 *  - Invoices Summary: detailed proforma and definitive invoices export
 *  - Customers: full client directory with activity counts
 *  - Locations: venue/location directory with usage counts
 *  - Providers: master provider catalog with contact info
 *  - Quotes: all quotes with status and financial data
 *  - Contracts: all contracts with status and signing info
 *  - Checklist: task completion stats per wedding
 *  - Gifts: gift income per wedding
 */

import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db/prisma';
import type { ExportFormat } from '@/lib/excel/export';

// ============================================================================
// TYPES
// ============================================================================

export interface WeddingsSummaryData {
  coupleNames: string;
  weddingDate: string;
  location: string;
  status: string;
  totalGuests: number;
  attendingGuests: number;
  pendingGuests: number;
  rsvpCompletion: string;
}

export interface GuestsSummaryData {
  coupleNames: string;
  weddingDate: string;
  totalFamilies: number;
  totalGuests: number;
  attendingGuests: number;
  notAttendingGuests: number;
  pendingGuests: number;
  rsvpPercent: string;
}

export interface ProviderPaymentsData {
  coupleNames: string;
  providerName: string;
  category: string;
  totalPrice: string;
  totalPaid: string;
  balance: string;
}

export interface RevenueSummaryData {
  type: 'Quote' | 'Proforma' | 'Invoice';
  reference: string;
  clientName: string;
  contractTitle: string;
  status: string;
  currency: string;
  total: string;
  amountPaid: string;
  balance: string;
  date: string;
}

export interface InvoicesSummaryData {
  type: 'PROFORMA' | 'INVOICE';
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientIdNumber: string;
  contractTitle: string;
  status: string;
  currency: string;
  subtotal: string;
  discount: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  amountPaid: string;
  balance: string;
  issuedAt: string;
  dueDate: string;
  paymentsCount: number;
  linkedInvoiceNumber: string;
  linkedProformaNumber: string;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

export async function fetchWeddingsSummary(planner_id: string): Promise<WeddingsSummaryData[]> {
  const weddings = await prisma.wedding.findMany({
    where: { planner_id, deleted_at: null },
    select: {
      couple_names: true,
      wedding_date: true,
      location: true,
      status: true,
      is_disabled: true,
      families: {
        select: {
          members: {
            select: { attending: true },
          },
        },
      },
    },
    orderBy: { wedding_date: 'asc' },
  });

  return weddings.map((w) => {
    const members = w.families.flatMap((f) => f.members);
    const totalGuests = members.length;
    const attendingGuests = members.filter((m) => m.attending === true).length;
    const pendingGuests = members.filter((m) => m.attending === null).length;
    const rsvpDone = members.filter((m) => m.attending !== null).length;
    const rsvpPercent = totalGuests > 0 ? `${Math.round((rsvpDone / totalGuests) * 100)}%` : '0%';
    const effectiveStatus = w.is_disabled ? 'DISABLED' : w.status;

    return {
      coupleNames: w.couple_names,
      weddingDate: new Date(w.wedding_date).toISOString().split('T')[0],
      location: w.location || '',
      status: effectiveStatus,
      totalGuests,
      attendingGuests,
      pendingGuests,
      rsvpCompletion: rsvpPercent,
    };
  });
}

export async function fetchGuestsSummary(planner_id: string): Promise<GuestsSummaryData[]> {
  const weddings = await prisma.wedding.findMany({
    where: { planner_id, deleted_at: null, status: { in: ['ACTIVE', 'COMPLETED'] } },
    select: {
      couple_names: true,
      wedding_date: true,
      families: {
        select: {
          id: true,
          members: { select: { attending: true } },
        },
      },
    },
    orderBy: { wedding_date: 'asc' },
  });

  return weddings.map((w) => {
    const members = w.families.flatMap((f) => f.members);
    const totalGuests = members.length;
    const attendingGuests = members.filter((m) => m.attending === true).length;
    const notAttendingGuests = members.filter((m) => m.attending === false).length;
    const pendingGuests = members.filter((m) => m.attending === null).length;
    const rsvpDone = attendingGuests + notAttendingGuests;
    const rsvpPercent = totalGuests > 0 ? `${Math.round((rsvpDone / totalGuests) * 100)}%` : '0%';

    return {
      coupleNames: w.couple_names,
      weddingDate: new Date(w.wedding_date).toISOString().split('T')[0],
      totalFamilies: w.families.length,
      totalGuests,
      attendingGuests,
      notAttendingGuests,
      pendingGuests,
      rsvpPercent,
    };
  });
}

export async function fetchProviderPayments(planner_id: string): Promise<ProviderPaymentsData[]> {
  const weddings = await prisma.wedding.findMany({
    where: { planner_id, deleted_at: null },
    select: {
      couple_names: true,
      providers: {
        select: {
          name: true,
          total_price: true,
          category: { select: { name: true } },
          payments: { select: { amount: true } },
        },
      },
    },
    orderBy: { wedding_date: 'asc' },
  });

  const rows: ProviderPaymentsData[] = [];
  for (const w of weddings) {
    for (const p of w.providers) {
      const totalPaid = p.payments.reduce((sum, pay) => sum + Number(pay.amount), 0);
      const totalPrice = Number(p.total_price ?? 0);
      rows.push({
        coupleNames: w.couple_names,
        providerName: p.name || '',
        category: p.category?.name || '',
        totalPrice: totalPrice.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        balance: (totalPrice - totalPaid).toFixed(2),
      });
    }
  }
  return rows;
}

export async function fetchRevenueSummary(planner_id: string): Promise<RevenueSummaryData[]> {
  const [quotes, invoices] = await Promise.all([
    prisma.quote.findMany({
      where: { planner_id },
      select: {
        id: true,
        couple_names: true,
        status: true,
        currency: true,
        total: true,
        created_at: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        planner_id,
        // Exclude converted proformas to avoid double-counting revenue
        OR: [
          { type: 'INVOICE' },
          { type: 'PROFORMA', derived_invoice: null },
        ],
      },
      select: {
        type: true,
        invoice_number: true,
        status: true,
        currency: true,
        total: true,
        amount_paid: true,
        issued_at: true,
        created_at: true,
        customer: { select: { name: true } },
        contract: { select: { title: true } },
        quote: { select: { couple_names: true } },
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  type RowWithDate = RevenueSummaryData & { _sortDate: Date };

  const rows: RowWithDate[] = [
    ...quotes.map((q): RowWithDate => ({
      type: 'Quote',
      reference: `Q-${q.id.slice(0, 8).toUpperCase()}`,
      clientName: q.couple_names,
      contractTitle: '',
      status: q.status,
      currency: q.currency,
      total: Number(q.total).toFixed(2),
      amountPaid: '—',
      balance: '—',
      date: q.created_at.toISOString().split('T')[0],
      _sortDate: q.created_at,
    })),
    ...invoices.map((inv): RowWithDate => {
      const total = Number(inv.total);
      const paid = Number(inv.amount_paid);
      const clientName = inv.customer?.name || inv.quote?.couple_names || '';
      return {
        type: inv.type === 'PROFORMA' ? 'Proforma' : 'Invoice',
        reference: inv.invoice_number,
        clientName,
        contractTitle: inv.contract?.title || '',
        status: inv.status,
        currency: inv.currency,
        total: total.toFixed(2),
        amountPaid: paid.toFixed(2),
        balance: (total - paid).toFixed(2),
        date: (inv.issued_at ?? inv.created_at).toISOString().split('T')[0],
        _sortDate: inv.issued_at ?? inv.created_at,
      };
    }),
  ];

  rows.sort((a, b) => b._sortDate.getTime() - a._sortDate.getTime());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return rows.map(({ _sortDate, ...rest }) => rest);
}

export async function fetchInvoicesSummary(planner_id: string): Promise<InvoicesSummaryData[]> {
  const invoices = await prisma.invoice.findMany({
    where: { planner_id },
    select: {
      type: true,
      invoice_number: true,
      status: true,
      currency: true,
      subtotal: true,
      discount: true,
      tax_rate: true,
      tax_amount: true,
      total: true,
      amount_paid: true,
      issued_at: true,
      due_date: true,
      created_at: true,
      customer: { select: { name: true, email: true, id_number: true } },
      contract: { select: { title: true } },
      payments: { select: { id: true } },
      derived_invoice: { select: { invoice_number: true } },
      proforma: { select: { invoice_number: true } },
    },
    orderBy: [{ type: 'asc' }, { created_at: 'desc' }],
  });

  return invoices.map((inv) => {
    const total = Number(inv.total);
    const paid = Number(inv.amount_paid);
    return {
      type: inv.type as 'PROFORMA' | 'INVOICE',
      invoiceNumber: inv.invoice_number,
      clientName: inv.customer?.name || '',
      clientEmail: inv.customer?.email || '',
      clientIdNumber: inv.customer?.id_number || '',
      contractTitle: inv.contract?.title || '',
      status: inv.status,
      currency: inv.currency,
      subtotal: Number(inv.subtotal).toFixed(2),
      discount: inv.discount !== null ? Number(inv.discount).toFixed(2) : '0.00',
      taxRate: inv.tax_rate !== null ? `${Number(inv.tax_rate)}%` : '0%',
      taxAmount: inv.tax_amount !== null ? Number(inv.tax_amount).toFixed(2) : '0.00',
      total: total.toFixed(2),
      amountPaid: paid.toFixed(2),
      balance: (total - paid).toFixed(2),
      issuedAt: inv.issued_at ? inv.issued_at.toISOString().split('T')[0] : '',
      dueDate: inv.due_date ? inv.due_date.toISOString().split('T')[0] : '',
      paymentsCount: inv.payments.length,
      linkedInvoiceNumber: inv.derived_invoice?.invoice_number || '',
      linkedProformaNumber: inv.proforma?.invoice_number || '',
    };
  });
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function exportWeddingsSummary(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchWeddingsSummary(planner_id);
  const rows: (string | number)[][] = [
    ['Couple Names', 'Wedding Date', 'Location', 'Status', 'Total Guests', 'Attending', 'Pending', 'RSVP%'],
  ];
  data.forEach((d) =>
    rows.push([d.coupleNames, d.weddingDate, d.location, d.status, d.totalGuests, d.attendingGuests, d.pendingGuests, d.rsvpCompletion]),
  );
  return generateExcelFile(rows, 'Weddings Summary', 'weddings-summary', format);
}

export async function exportGuestsSummary(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchGuestsSummary(planner_id);
  const rows: (string | number)[][] = [
    ['Couple Names', 'Wedding Date', 'Families', 'Total Guests', 'Attending', 'Not Attending', 'Pending', 'RSVP%'],
  ];
  data.forEach((d) =>
    rows.push([d.coupleNames, d.weddingDate, d.totalFamilies, d.totalGuests, d.attendingGuests, d.notAttendingGuests, d.pendingGuests, d.rsvpPercent]),
  );
  return generateExcelFile(rows, 'Guests Summary', 'guests-summary', format);
}

export async function exportProviderPayments(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchProviderPayments(planner_id);
  const rows: (string | number)[][] = [
    ['Couple Names', 'Provider', 'Category', 'Total Price', 'Total Paid', 'Balance'],
  ];
  data.forEach((d) =>
    rows.push([d.coupleNames, d.providerName, d.category, d.totalPrice, d.totalPaid, d.balance]),
  );
  return generateExcelFile(rows, 'Provider Payments', 'provider-payments', format);
}

export async function exportRevenueSummary(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchRevenueSummary(planner_id);
  const rows: (string | number)[][] = [
    ['Type', 'Reference', 'Client', 'Contract', 'Status', 'Currency', 'Total', 'Paid', 'Balance', 'Date'],
  ];
  data.forEach((d) =>
    rows.push([d.type, d.reference, d.clientName, d.contractTitle, d.status, d.currency, d.total, d.amountPaid, d.balance, d.date]),
  );
  return generateExcelFile(rows, 'Revenue Summary', 'revenue-summary', format);
}

export async function exportInvoicesSummary(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchInvoicesSummary(planner_id);
  const rows: (string | number)[][] = [
    [
      'Type', 'Invoice No.', 'Client', 'Email', 'ID/Passport', 'Contract',
      'Status', 'Currency', 'Subtotal', 'Discount', 'Tax Rate', 'Tax Amount',
      'Total', 'Paid', 'Balance', 'Issued', 'Due Date', 'Payments',
      'Linked Invoice', 'Linked Proforma',
    ],
  ];
  data.forEach((d) =>
    rows.push([
      d.type, d.invoiceNumber, d.clientName, d.clientEmail, d.clientIdNumber, d.contractTitle,
      d.status, d.currency, d.subtotal, d.discount, d.taxRate, d.taxAmount,
      d.total, d.amountPaid, d.balance, d.issuedAt, d.dueDate, d.paymentsCount,
      d.linkedInvoiceNumber, d.linkedProformaNumber,
    ]),
  );
  return generateExcelFile(rows, 'Invoices', 'invoices', format);
}

export interface CustomerData {
  name: string;
  coupleNames: string;
  email: string;
  phone: string;
  idNumber: string;
  address: string;
  notes: string;
  totalWeddings: number;
  totalQuotes: number;
  totalContracts: number;
  totalInvoices: number;
  createdAt: string;
}

export interface LocationData {
  name: string;
  address: string;
  url: string;
  googleMapsUrl: string;
  tags: string;
  notes: string;
  totalWeddings: number;
  createdAt: string;
}

export interface ProviderData {
  category: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  socialMedia: string;
  approxPrice: string;
  totalWeddingAssignments: number;
  createdAt: string;
}

export interface QuoteData {
  reference: string;
  clientName: string;
  coupleNames: string;
  eventDate: string;
  location: string;
  status: string;
  currency: string;
  subtotal: string;
  discount: string;
  taxRate: string;
  total: string;
  expiresAt: string;
  version: number;
  createdAt: string;
}

export interface ContractData {
  title: string;
  clientName: string;
  status: string;
  signerName: string;
  signerEmail: string;
  signedAt: string;
  linkedQuote: string;
  createdAt: string;
}

export interface ChecklistData {
  coupleNames: string;
  weddingDate: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completionPercent: string;
  overdueTasks: number;
}

export interface GiftData {
  coupleNames: string;
  weddingDate: string;
  familyName: string;
  amount: string;
  status: string;
  transactionDate: string;
  autoMatched: string;
}

// ============================================================================
// DATA FETCHING — extended tables
// ============================================================================

export async function fetchCustomers(planner_id: string): Promise<CustomerData[]> {
  const customers = await prisma.customer.findMany({
    where: { planner_id },
    select: {
      name: true,
      couple_names: true,
      email: true,
      phone: true,
      id_number: true,
      address: true,
      notes: true,
      created_at: true,
      _count: { select: { weddings: true, quotes: true, contracts: true, invoices: true } },
    },
    orderBy: { name: 'asc' },
  });

  return customers.map((c) => ({
    name: c.name,
    coupleNames: c.couple_names ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    idNumber: c.id_number ?? '',
    address: c.address ?? '',
    notes: c.notes ?? '',
    totalWeddings: c._count.weddings,
    totalQuotes: c._count.quotes,
    totalContracts: c._count.contracts,
    totalInvoices: c._count.invoices,
    createdAt: c.created_at.toISOString().split('T')[0],
  }));
}

export async function fetchLocations(planner_id: string): Promise<LocationData[]> {
  const locations = await prisma.location.findMany({
    where: { planner_id },
    select: {
      name: true,
      address: true,
      url: true,
      google_maps_url: true,
      tags: true,
      notes: true,
      created_at: true,
      _count: { select: { weddings: true } },
    },
    orderBy: { name: 'asc' },
  });

  return locations.map((l) => ({
    name: l.name,
    address: l.address ?? '',
    url: l.url ?? '',
    googleMapsUrl: l.google_maps_url ?? '',
    tags: l.tags.join(', '),
    notes: l.notes ?? '',
    totalWeddings: l._count.weddings,
    createdAt: l.created_at.toISOString().split('T')[0],
  }));
}

export async function fetchProviders(planner_id: string): Promise<ProviderData[]> {
  const providers = await prisma.provider.findMany({
    where: { planner_id },
    select: {
      name: true,
      contact_name: true,
      email: true,
      phone: true,
      website: true,
      social_media: true,
      approx_price: true,
      created_at: true,
      category: { select: { name: true } },
      _count: { select: { wedding_assignments: true } },
    },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
  });

  return providers.map((p) => ({
    category: p.category.name,
    name: p.name,
    contactName: p.contact_name ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
    website: p.website ?? '',
    socialMedia: p.social_media ?? '',
    approxPrice: p.approx_price !== null ? Number(p.approx_price).toFixed(2) : '',
    totalWeddingAssignments: p._count.wedding_assignments,
    createdAt: p.created_at.toISOString().split('T')[0],
  }));
}

export async function fetchQuotes(planner_id: string): Promise<QuoteData[]> {
  const quotes = await prisma.quote.findMany({
    where: { planner_id },
    select: {
      id: true,
      couple_names: true,
      event_date: true,
      location: true,
      status: true,
      currency: true,
      subtotal: true,
      discount: true,
      tax_rate: true,
      total: true,
      expires_at: true,
      version: true,
      created_at: true,
      customer: { select: { name: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  return quotes.map((q) => ({
    reference: `Q-${q.id.slice(0, 8).toUpperCase()}`,
    clientName: q.customer?.name ?? '',
    coupleNames: q.couple_names,
    eventDate: q.event_date ? q.event_date.toISOString().split('T')[0] : '',
    location: q.location ?? '',
    status: q.status,
    currency: q.currency,
    subtotal: Number(q.subtotal).toFixed(2),
    discount: q.discount !== null ? Number(q.discount).toFixed(2) : '0.00',
    taxRate: q.tax_rate !== null ? `${Number(q.tax_rate)}%` : '0%',
    total: Number(q.total).toFixed(2),
    expiresAt: q.expires_at ? q.expires_at.toISOString().split('T')[0] : '',
    version: q.version,
    createdAt: q.created_at.toISOString().split('T')[0],
  }));
}

export async function fetchContracts(planner_id: string): Promise<ContractData[]> {
  const contracts = await prisma.contract.findMany({
    where: { planner_id },
    select: {
      title: true,
      status: true,
      signer_name: true,
      signer_email: true,
      signed_at: true,
      created_at: true,
      customer: { select: { name: true } },
      quote: { select: { couple_names: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  return contracts.map((c) => ({
    title: c.title,
    clientName: c.customer?.name ?? c.quote?.couple_names ?? '',
    status: c.status,
    signerName: c.signer_name ?? '',
    signerEmail: c.signer_email ?? '',
    signedAt: c.signed_at ? c.signed_at.toISOString().split('T')[0] : '',
    linkedQuote: c.quote?.couple_names ?? '',
    createdAt: c.created_at.toISOString().split('T')[0],
  }));
}

export async function fetchChecklist(planner_id: string): Promise<ChecklistData[]> {
  const weddings = await prisma.wedding.findMany({
    where: { planner_id, deleted_at: null },
    select: {
      couple_names: true,
      wedding_date: true,
      checklist_tasks: {
        select: { status: true, completed: true, due_date: true },
      },
    },
    orderBy: { wedding_date: 'asc' },
  });

  const now = new Date();
  return weddings.map((w) => {
    const tasks = w.checklist_tasks;
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const inProgress = tasks.filter((t) => !t.completed && t.status === 'IN_PROGRESS').length;
    const pending = tasks.filter((t) => !t.completed && t.status === 'PENDING').length;
    const overdue = tasks.filter(
      (t) => !t.completed && t.due_date !== null && t.due_date < now,
    ).length;
    const pct = total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';

    return {
      coupleNames: w.couple_names,
      weddingDate: new Date(w.wedding_date).toISOString().split('T')[0],
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: pending,
      inProgressTasks: inProgress,
      completionPercent: pct,
      overdueTasks: overdue,
    };
  });
}

export async function fetchGifts(planner_id: string): Promise<GiftData[]> {
  const weddings = await prisma.wedding.findMany({
    where: { planner_id, deleted_at: null },
    select: {
      couple_names: true,
      wedding_date: true,
      families: {
        select: {
          name: true,
          gifts: {
            select: {
              amount: true,
              status: true,
              transaction_date: true,
              auto_matched: true,
            },
          },
        },
      },
    },
    orderBy: { wedding_date: 'asc' },
  });

  const rows: GiftData[] = [];
  for (const w of weddings) {
    const weddingDate = new Date(w.wedding_date).toISOString().split('T')[0];
    for (const family of w.families) {
      for (const gift of family.gifts) {
        rows.push({
          coupleNames: w.couple_names,
          weddingDate,
          familyName: family.name,
          amount: Number(gift.amount).toFixed(2),
          status: gift.status,
          transactionDate: gift.transaction_date.toISOString().split('T')[0],
          autoMatched: gift.auto_matched ? 'Yes' : 'No',
        });
      }
    }
  }
  return rows;
}

// ============================================================================
// EXPORT FUNCTIONS — extended tables
// ============================================================================

export async function exportCustomers(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchCustomers(planner_id);
  const rows: (string | number)[][] = [
    ['Name', 'Couple Names', 'Email', 'Phone', 'ID/Passport', 'Address', 'Notes', 'Weddings', 'Quotes', 'Contracts', 'Invoices', 'Since'],
  ];
  data.forEach((d) =>
    rows.push([d.name, d.coupleNames, d.email, d.phone, d.idNumber, d.address, d.notes, d.totalWeddings, d.totalQuotes, d.totalContracts, d.totalInvoices, d.createdAt]),
  );
  return generateExcelFile(rows, 'Customers', 'customers', format);
}

export async function exportLocations(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchLocations(planner_id);
  const rows: (string | number)[][] = [
    ['Name', 'Address', 'Website', 'Google Maps', 'Tags', 'Notes', 'Weddings', 'Since'],
  ];
  data.forEach((d) =>
    rows.push([d.name, d.address, d.url, d.googleMapsUrl, d.tags, d.notes, d.totalWeddings, d.createdAt]),
  );
  return generateExcelFile(rows, 'Locations', 'locations', format);
}

export async function exportProviders(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchProviders(planner_id);
  const rows: (string | number)[][] = [
    ['Category', 'Name', 'Contact', 'Email', 'Phone', 'Website', 'Social Media', 'Approx. Price', 'Wedding Assignments', 'Since'],
  ];
  data.forEach((d) =>
    rows.push([d.category, d.name, d.contactName, d.email, d.phone, d.website, d.socialMedia, d.approxPrice, d.totalWeddingAssignments, d.createdAt]),
  );
  return generateExcelFile(rows, 'Providers', 'providers', format);
}

export async function exportQuotes(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchQuotes(planner_id);
  const rows: (string | number)[][] = [
    ['Reference', 'Client', 'Couple Names', 'Event Date', 'Location', 'Status', 'Currency', 'Subtotal', 'Discount', 'Tax Rate', 'Total', 'Expires', 'Version', 'Created'],
  ];
  data.forEach((d) =>
    rows.push([d.reference, d.clientName, d.coupleNames, d.eventDate, d.location, d.status, d.currency, d.subtotal, d.discount, d.taxRate, d.total, d.expiresAt, d.version, d.createdAt]),
  );
  return generateExcelFile(rows, 'Quotes', 'quotes', format);
}

export async function exportContracts(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchContracts(planner_id);
  const rows: (string | number)[][] = [
    ['Title', 'Client', 'Status', 'Signer Name', 'Signer Email', 'Signed At', 'Linked Quote', 'Created'],
  ];
  data.forEach((d) =>
    rows.push([d.title, d.clientName, d.status, d.signerName, d.signerEmail, d.signedAt, d.linkedQuote, d.createdAt]),
  );
  return generateExcelFile(rows, 'Contracts', 'contracts', format);
}

export async function exportChecklist(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchChecklist(planner_id);
  const rows: (string | number)[][] = [
    ['Couple Names', 'Wedding Date', 'Total Tasks', 'Completed', 'Pending', 'In Progress', 'Completion %', 'Overdue'],
  ];
  data.forEach((d) =>
    rows.push([d.coupleNames, d.weddingDate, d.totalTasks, d.completedTasks, d.pendingTasks, d.inProgressTasks, d.completionPercent, d.overdueTasks]),
  );
  return generateExcelFile(rows, 'Checklist', 'checklist', format);
}

export async function exportGifts(
  planner_id: string,
  format: ExportFormat = 'xlsx',
) {
  const data = await fetchGifts(planner_id);
  const rows: (string | number)[][] = [
    ['Couple Names', 'Wedding Date', 'Family', 'Amount', 'Status', 'Transaction Date', 'Auto-Matched'],
  ];
  data.forEach((d) =>
    rows.push([d.coupleNames, d.weddingDate, d.familyName, d.amount, d.status, d.transactionDate, d.autoMatched]),
  );
  return generateExcelFile(rows, 'Gifts', 'gifts', format);
}

// ============================================================================
// HELPER
// ============================================================================

function generateExcelFile(
  rows: (string | number)[][],
  sheetName: string,
  filePrefix: string,
  format: ExportFormat,
) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  const columnWidths = rows[0].map((_, colIndex) => {
    const maxLength = Math.max(...rows.map((row) => String(row[colIndex] || '').length));
    return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
  });
  worksheet['!cols'] = columnWidths;
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const timestamp = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return {
      buffer: Buffer.from(csv, 'utf-8'),
      filename: `${filePrefix}-${timestamp}.csv`,
      mimeType: 'text/csv',
    };
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return {
    buffer: Buffer.from(buffer),
    filename: `${filePrefix}-${timestamp}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
