'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceDetail } from './InvoiceDetail';
import type { InvoicePrefillData } from '../contracts/ContractsList';
import { FilterBar } from '../FilterBar';
import { Pagination } from '../Pagination';

export interface Invoice {
  id: string;
  type: 'PROFORMA' | 'INVOICE';
  invoice_number: string;
  customer: { id: string; name: string; email: string | null; phone: string | null; id_number: string | null; address: string | null; notes: string | null } | null;
  description: string | null;
  currency: string;
  subtotal: string | number;
  discount: string | number | null;
  tax_rate: string | number | null;
  tax_amount: string | number | null;
  due_date: string | null;
  issued_at: string | null;
  total: string | number;
  amount_paid: string | number;
  status: string;
  pdf_url: string | null;
  created_at: string;
  quote: { id: string; couple_names: string; contracts: { id: string; title: string }[] } | null;
  contract: { id: string; title: string; status: string } | null;
  derived_invoice: { id: string; invoice_number: string; status: string } | null;
  proforma: { id: string; invoice_number: string } | null;
  line_items: {
    id: string;
    name: string;
    description: string | null;
    quantity: string | number;
    unit_price: string | number;
    total: string | number;
  }[];
  payments: {
    id: string;
    amount: string | number;
    currency: string;
    payment_date: string;
    method: string;
    reference: string | null;
  }[];
}

interface SignedContract {
  id: string;
  title: string;
  customer: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

type View = 'list' | 'new' | 'edit' | 'detail';

interface InvoicesListProps {
  externalPrefill?: InvoicePrefillData | null;
  onExternalPrefillConsumed?: () => void;
}

export function InvoicesList({ externalPrefill, onExternalPrefillConsumed }: InvoicesListProps) {
  const t = useTranslations('planner.quotesFinances');
  const format = useFormatter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [signedContracts, setSignedContracts] = useState<SignedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [externalFormData, setExternalFormData] = useState<InvoicePrefillData | null>(null);
  const [prefillContractId, setPrefillContractId] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    if (externalPrefill) {
      setExternalFormData(externalPrefill);
      setView('new');
      onExternalPrefillConsumed?.();
    }
  }, [externalPrefill]); // onExternalPrefillConsumed is intentionally excluded — it's a stable callback

  async function fetchData() {
    const [invoiceRes, contractRes] = await Promise.all([
      fetch('/api/planner/invoices'),
      fetch('/api/planner/contracts?status=SIGNED'),
    ]);

    if (invoiceRes.ok) {
      const json = await invoiceRes.json();
      setInvoices(json.data ?? []);
    }

    if (contractRes.ok) {
      const json = await contractRes.json();
      setSignedContracts(json.data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCreate(data: Record<string, unknown>) {
    await fetch('/api/planner/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setExternalFormData(null);
    setPrefillContractId(null);
    setView('list');
    fetchData();
  }

  async function handleEdit(data: Record<string, unknown>) {
    if (!editingId) return;
    await fetch(`/api/planner/invoices/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setInvoices((prev) => prev.map((i) => i.id === editingId ? { ...i, pdf_url: null } : i));
    setEditingId(null);
    setView('list');
    fetchData();
  }

  function handleCancelForm() {
    setView('list');
    setExternalFormData(null);
    setPrefillContractId(null);
    setEditingId(null);
  }

  function handleCreateForContract(contract: SignedContract) {
    setPrefillContractId(contract.id);
    setExternalFormData(null);
    setEditingId(null);
    setView('new');
  }

  function handleOpenEdit(invoice: Invoice) {
    setEditingId(invoice.id);
    setView('edit');
  }

  async function handleGeneratePdf(invoice: Invoice) {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
      return;
    }
    setGenerating(invoice.id);
    const res = await fetch(`/api/planner/invoices/${invoice.id}/generate-pdf`, { method: 'POST' });
    if (res.ok) {
      const { data } = await res.json();
      window.open(data.pdf_url, '_blank');
      fetchData();
    }
    setGenerating(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this invoice?')) return;
    await fetch(`/api/planner/invoices/${id}`, { method: 'DELETE' });
    fetchData();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin w-6 h-6 border-4 border-rose-500 border-t-transparent rounded-full" />
    </div>
  );

  const selectedInvoice = selectedId ? invoices.find((i) => i.id === selectedId) ?? null : null;
  const editingInvoice = editingId ? invoices.find((i) => i.id === editingId) ?? null : null;

  if (view === 'new') {
    const contractForPrefill = prefillContractId
      ? signedContracts.find((c) => c.id === prefillContractId) ?? null
      : null;

    const prefill = externalFormData
      ? { ...externalFormData, type: 'PROFORMA' as const }
      : contractForPrefill
        ? {
            type: 'PROFORMA' as const,
            contract_id: contractForPrefill.id,
            client_name: contractForPrefill.customer?.name ?? '',
          }
        : { type: 'PROFORMA' as const };

    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={handleCancelForm} className="text-sm text-gray-500 hover:text-gray-700">
            {t('invoices.back')}
          </button>
          <h3 className="text-base font-semibold text-gray-900">{t('invoices.newProforma')}</h3>
        </div>
        <InvoiceForm
          initialData={prefill}
          onSave={handleCreate}
          onCancel={handleCancelForm}
        />
      </div>
    );
  }

  if (view === 'edit' && editingInvoice) {
    const prefill = {
      type: editingInvoice.type,
      customer_id: editingInvoice.customer?.id ?? null,
      contract_id: editingInvoice.contract?.id ?? '',
      client_name: editingInvoice.customer?.name ?? '',
      client_email: editingInvoice.customer?.email ?? '',
      client_id_number: editingInvoice.customer?.id_number ?? '',
      client_address: editingInvoice.customer?.address ?? '',
      description: editingInvoice.description ?? '',
      currency: editingInvoice.currency,
      discount: editingInvoice.discount !== null ? Number(editingInvoice.discount) : ('' as const),
      tax_rate: editingInvoice.tax_rate !== null ? Number(editingInvoice.tax_rate) : ('' as const),
      due_date: editingInvoice.due_date ? editingInvoice.due_date.substring(0, 10) : '',
      issued_at: editingInvoice.issued_at ?? new Date().toISOString(),
      quote_id: editingInvoice.quote?.id ?? '',
      line_items: editingInvoice.line_items.map((li) => ({
        name: li.name,
        description: li.description ?? '',
        quantity: Number(li.quantity),
        unit_price: Number(li.unit_price),
        total: Number(li.total),
      })),
    };

    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={handleCancelForm} className="text-sm text-gray-500 hover:text-gray-700">
            {t('invoices.back')}
          </button>
          <h3 className="text-base font-semibold text-gray-900">{t('invoices.editInvoiceFor', { name: editingInvoice.customer?.name ?? '' })}</h3>
        </div>
        <InvoiceForm
          initialData={prefill}
          onSave={handleEdit}
          onCancel={handleCancelForm}
        />
      </div>
    );
  }

  if (view === 'detail' && selectedInvoice) {
    return (
      <InvoiceDetail
        invoice={selectedInvoice}
        onBack={() => { setView('list'); setSelectedId(null); }}
        onRefresh={fetchData}
      />
    );
  }

  const now = new Date();

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const clientName = inv.customer?.name ?? '';
    const nameMatch = nameFilter.trim() === '' || clientName.toLowerCase().includes(nameFilter.toLowerCase());
    const isEffectivelyOverdue =
      inv.status !== 'PAID' &&
      inv.status !== 'CANCELLED' &&
      inv.status !== 'DRAFT' &&
      !!inv.due_date &&
      new Date(inv.due_date) < now;
    const effectiveStatus = isEffectivelyOverdue ? 'OVERDUE' : inv.status;
    const statusMatch = statusFilter.length === 0 || statusFilter.includes(effectiveStatus) || statusFilter.includes(inv.status);
    return nameMatch && statusMatch;
  });

  // Group by contract: { contractId | null -> invoices[] }
  const groups: Map<string | null, { contract: Invoice['contract'] | null; items: Invoice[] }> = new Map();

  for (const inv of filteredInvoices) {
    const key = inv.contract?.id ?? null;
    if (!groups.has(key)) {
      groups.set(key, { contract: inv.contract ?? null, items: [] });
    }
    groups.get(key)!.items.push(inv);
  }

  // Signed contracts with no proformas yet (for the "ready" banner)
  const contractIdsWithInvoices = new Set(invoices.filter((i) => i.contract_id).map((i) => i.contract?.id));
  const readyContracts = signedContracts.filter((c) => !contractIdsWithInvoices.has(c.id));

  // Sort groups: contracts first (alphabetically by title), then null group last
  const sortedGroupKeys = [...groups.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    const titleA = groups.get(a)?.contract?.title ?? '';
    const titleB = groups.get(b)?.contract?.title ?? '';
    return titleA.localeCompare(titleB);
  });

  const pagedGroupKeys = sortedGroupKeys.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const INVOICE_STATUS_OPTIONS = [
    { value: 'DRAFT', label: t('invoices.status.DRAFT') },
    { value: 'ISSUED', label: t('invoices.status.ISSUED') },
    { value: 'PARTIAL', label: t('invoices.status.PARTIAL') },
    { value: 'PAID', label: t('invoices.status.PAID') },
    { value: 'OVERDUE', label: t('invoices.status.OVERDUE') },
    { value: 'CANCELLED', label: t('invoices.status.CANCELLED') },
  ];

  return (
    <div>
      {/* Ready to invoice — signed contracts with no proformas yet */}
      {readyContracts.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('invoices.readyToInvoice', { count: readyContracts.length })}
          </h4>
          <div className="space-y-2">
            {readyContracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-100 px-4 py-3">
                <div>
                  <span className="text-sm font-semibold text-gray-900">{c.title}</span>
                  {c.customer && <span className="ml-2 text-sm text-gray-500">{c.customer.name}</span>}
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{t('invoices.contractSigned')}</span>
                </div>
                <button
                  onClick={() => handleCreateForContract(c)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all shadow-sm"
                >
                  {t('invoices.addProforma')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <FilterBar
        nameValue={nameFilter}
        onNameChange={(v) => { setNameFilter(v); setPage(1); }}
        namePlaceholder={t('invoices.searchPlaceholder')}
        statusOptions={INVOICE_STATUS_OPTIONS}
        selectedStatuses={statusFilter}
        onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
        statusLabel={t('filterBar.status')}
        clearFiltersLabel={t('filterBar.clearFilters')}
      />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">{t('invoices.title')}</h3>
        <button
          onClick={() => { setPrefillContractId(null); setExternalFormData(null); setView('new'); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('invoices.newProforma')}
        </button>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          {nameFilter || statusFilter.length > 0 ? (
            <>
              <h3 className="text-sm font-semibold text-gray-900">{t('invoices.noMatch')}</h3>
              <p className="text-xs text-gray-500 mt-1">{t('invoices.noMatchHint')}</p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-gray-900">{t('invoices.empty')}</h3>
              <p className="text-xs text-gray-500 mt-1">{t('invoices.emptyHint')}</p>
              <button
                onClick={() => setView('new')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all"
              >
                {t('invoices.newProforma')}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {pagedGroupKeys.map((contractKey) => {
              const group = groups.get(contractKey)!;
              const hasContract = contractKey !== null;

              return (
                <div key={contractKey ?? 'no-contract'} className="space-y-2">
                  {/* Contract group header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasContract ? (
                        <>
                          <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-700">
                            {group.contract!.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            {t('invoices.contractBadge')}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-gray-400">{t('invoices.noContractGroup')}</span>
                      )}
                    </div>
                    {hasContract && (
                      <button
                        onClick={() => {
                          const contract = signedContracts.find((c) => c.id === contractKey);
                          if (contract) {
                            handleCreateForContract(contract);
                          } else {
                            // Contract exists but may not be in signedContracts (already has invoices)
                            setPrefillContractId(contractKey);
                            setExternalFormData(null);
                            setEditingId(null);
                            setView('new');
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t('invoices.addProforma')}
                      </button>
                    )}
                  </div>

                  {/* Invoices in this group */}
                  <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                    {group.items.map((invoice) => (
                      <InvoiceCard
                        key={invoice.id}
                        invoice={invoice}
                        generating={generating}
                        onView={() => { setSelectedId(invoice.id); setView('detail'); }}
                        onEdit={() => handleOpenEdit(invoice)}
                        onGeneratePdf={() => handleGeneratePdf(invoice)}
                        onDelete={() => handleDelete(invoice.id)}
                        t={t}
                        format={format}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination total={sortedGroupKeys.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// InvoiceCard sub-component
// -----------------------------------------------------------------------------

interface InvoiceCardProps {
  invoice: Invoice;
  generating: string | null;
  onView: () => void;
  onEdit: () => void;
  onGeneratePdf: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useTranslations<'planner.quotesFinances'>>;
  format: ReturnType<typeof useFormatter>;
}

function InvoiceCard({ invoice, generating, onView, onEdit, onGeneratePdf, onDelete, t, format }: InvoiceCardProps) {
  const total = Number(invoice.total);
  const paid = Number(invoice.amount_paid);
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const isProforma = invoice.type === 'PROFORMA';
  const isRegularInvoice = invoice.type === 'INVOICE';

  const now = new Date();
  const isEffectivelyOverdue =
    invoice.status !== 'PAID' &&
    invoice.status !== 'CANCELLED' &&
    invoice.status !== 'DRAFT' &&
    !!invoice.due_date &&
    new Date(invoice.due_date) < now;

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${isProforma ? 'border-blue-100' : 'border-green-100'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type badge */}
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              isProforma ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }`}>
              {t(`invoices.type.${invoice.type}` as Parameters<typeof t>[0])}
            </span>
            <span className="text-xs font-mono text-gray-400">{invoice.invoice_number}</span>
            <h4 className="text-sm font-semibold text-gray-900">{invoice.customer?.name ?? ''}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[invoice.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {t(`invoices.status.${invoice.status}` as Parameters<typeof t>[0])}
            </span>
            {isEffectivelyOverdue && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                {t('invoices.status.OVERDUE')}
              </span>
            )}
          </div>

          {/* Linked invoice/proforma badges */}
          <div className="flex flex-wrap gap-1 mt-1">
            {isProforma && invoice.derived_invoice && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {t('invoices.linkedInvoice', { number: invoice.derived_invoice.invoice_number })}
              </span>
            )}
            {isRegularInvoice && invoice.proforma && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {t('invoices.linkedProforma', { number: invoice.proforma.invoice_number })}
              </span>
            )}
          </div>

          {invoice.due_date && (
            <p className="text-xs text-gray-500 mt-1">
              {t('invoices.due', { date: format.dateTime(new Date(invoice.due_date), { day: 'numeric', month: 'short', year: 'numeric' }) })}
            </p>
          )}
          {invoice.status !== 'PAID' && invoice.status !== 'DRAFT' && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{t('invoices.paid', { amount: format.number(paid, { style: 'currency', currency: invoice.currency }) })}</span>
                <span>{paidPct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-bold text-gray-900">
            {format.number(total, { style: 'currency', currency: invoice.currency })}
          </span>
          {paid > 0 && paid < total && (
            <span className="text-xs text-orange-600 font-medium">
              {t('invoices.remaining', { amount: format.number(total - paid, { style: 'currency', currency: invoice.currency }) })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
        {/* Edit: only for proformas */}
        {isProforma && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {t('invoices.edit')}
          </button>
        )}
        <button
          onClick={onView}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {t('invoices.viewAndPayments')}
        </button>
        <button
          onClick={onGeneratePdf}
          disabled={generating === invoice.id}
          className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            invoice.pdf_url
              ? 'text-gray-700 bg-gray-50 hover:bg-gray-100'
              : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
          }`}
          title={invoice.pdf_url ? 'Download existing PDF' : 'PDF needs to be generated'}
        >
          {generating === invoice.id ? (
            <span className="animate-spin w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full inline-block" />
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {invoice.pdf_url ? t('invoices.downloadPdf') : t('invoices.generatePdf')}
            </>
          )}
        </button>

        {/* Delete: only for proformas, not regular invoices */}
        {isProforma && !invoice.derived_invoice && (
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ml-auto"
          >
            {t('invoices.delete')}
          </button>
        )}
      </div>
    </div>
  );
}
