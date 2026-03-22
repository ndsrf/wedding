'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceDetail } from './InvoiceDetail';
import type { InvoicePrefillData } from '../contracts/ContractsList';
import { FilterBar } from '../FilterBar';
import { Pagination } from '../Pagination';

export interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
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

interface ReadyQuote {
  id: string;
  couple_names: string;
  client_email: string | null;
  currency: string;
  total: string | number;
  contract: { id: string; status: string } | null;
  invoices: { id: string }[];
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [readyQuotes, setReadyQuotes] = useState<ReadyQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [prefillQuote, setPrefillQuote] = useState<ReadyQuote | null>(null);
  const [externalFormData, setExternalFormData] = useState<InvoicePrefillData | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (externalPrefill) {
      setExternalFormData(externalPrefill);
      setPrefillQuote(null);
      setView('new');
      onExternalPrefillConsumed?.();
    }
  }, [externalPrefill]); // onExternalPrefillConsumed is intentionally excluded — it's a stable callback

  async function fetchData() {
    const [invoiceRes, quoteRes] = await Promise.all([
      fetch('/api/planner/invoices'),
      fetch('/api/planner/quotes?status=ACCEPTED'),
    ]);

    if (invoiceRes.ok) {
      const json = await invoiceRes.json();
      setInvoices(json.data ?? []);
    }

    if (quoteRes.ok) {
      const json = await quoteRes.json();
      const accepted: ReadyQuote[] = (json.data ?? []).filter(
        (q: ReadyQuote) => q.contract && q.invoices.length === 0,
      );
      setReadyQuotes(accepted);
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
    setPrefillQuote(null);
    setExternalFormData(null);
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
    // Immediately clear pdf_url in local state so the UI reflects that it needs regeneration
    setInvoices((prev) => prev.map((i) => i.id === editingId ? { ...i, pdf_url: null } : i));
    setEditingId(null);
    setView('list');
    fetchData();
  }

  function handleCancelForm() {
    setView('list');
    setPrefillQuote(null);
    setExternalFormData(null);
    setEditingId(null);
  }

  function handleCreateFromQuote(q: ReadyQuote) {
    setExternalFormData(null);
    setPrefillQuote(q);
    setEditingId(null);
    setView('new');
  }

  function handleOpenEdit(invoice: Invoice) {
    setEditingId(invoice.id);
    setView('edit');
  }

  async function handleGeneratePdf(invoice: Invoice) {
    // If PDF exists and hasn't been cleared, just open it
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
      return;
    }
    // Otherwise generate fresh PDF (fetches latest data from DB)
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
    const prefill = externalFormData
      ? externalFormData
      : prefillQuote
        ? {
            client_name: prefillQuote.couple_names,
            client_email: prefillQuote.client_email ?? '',
            currency: prefillQuote.currency,
            quote_id: prefillQuote.id,
          }
        : {};

    const formTitle = externalFormData?.client_name
      ? `New Invoice – ${externalFormData.client_name}`
      : prefillQuote
        ? `New Invoice – ${prefillQuote.couple_names}`
        : 'New Invoice';

    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={handleCancelForm} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <h3 className="text-base font-semibold text-gray-900">{formTitle}</h3>
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
      client_name: editingInvoice.client_name,
      client_email: editingInvoice.client_email ?? '',
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
            ← Back
          </button>
          <h3 className="text-base font-semibold text-gray-900">Edit Invoice – {editingInvoice.client_name}</h3>
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

  const filteredInvoices = invoices.filter((inv) => {
    const nameMatch = nameFilter.trim() === '' || inv.client_name.toLowerCase().includes(nameFilter.toLowerCase());
    const statusMatch = statusFilter.length === 0 || statusFilter.includes(inv.status);
    return nameMatch && statusMatch;
  });
  const pagedInvoices = filteredInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const INVOICE_STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ISSUED', label: 'Issued' },
    { value: 'PARTIAL', label: 'Partial' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div>
      {/* Ready to invoice — accepted quotes with contract but no invoice yet */}
      {readyQuotes.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ready to Invoice ({readyQuotes.length})
          </h4>
          <div className="space-y-2">
            {readyQuotes.map((q) => (
              <div key={q.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-100 px-4 py-3">
                <div>
                  <span className="text-sm font-semibold text-gray-900">{q.couple_names}</span>
                  <span className="ml-3 text-sm text-gray-500">
                    {new Intl.NumberFormat('en', { style: 'currency', currency: q.currency }).format(Number(q.total))}
                  </span>
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Contract signed</span>
                </div>
                <button
                  onClick={() => handleCreateFromQuote(q)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all shadow-sm"
                >
                  Create Invoice
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <FilterBar
        nameValue={nameFilter}
        onNameChange={(v) => { setNameFilter(v); setPage(1); }}
        namePlaceholder="Search by client name…"
        statusOptions={INVOICE_STATUS_OPTIONS}
        selectedStatuses={statusFilter}
        onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
      />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Invoices</h3>
        <button
          onClick={() => { setPrefillQuote(null); setView('new'); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Invoice
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
              <h3 className="text-sm font-semibold text-gray-900">No invoices match your filters</h3>
              <p className="text-xs text-gray-500 mt-1">Try adjusting your search or status filters.</p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-gray-900">No invoices yet</h3>
              <p className="text-xs text-gray-500 mt-1">Create an invoice to track your payments.</p>
              <button
                onClick={() => setView('new')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all"
              >
                Create Invoice
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pagedInvoices.map((invoice) => {
            const total = Number(invoice.total);
            const paid = Number(invoice.amount_paid);
            const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
            const isDraft = invoice.status === 'DRAFT';
            return (
              <div key={invoice.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{invoice.invoice_number}</span>
                      <h4 className="text-sm font-semibold text-gray-900">{invoice.client_name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[invoice.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {invoice.status}
                      </span>
                      {invoice.quote && (
                        <Link
                          href="/planner/quotes-finances?tab=quotes"
                          className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                          title={`Go to quote: ${invoice.quote.couple_names}`}
                        >
                          Quote
                        </Link>
                      )}
                      {invoice.quote?.contracts[0] && (
                        <Link
                          href="/planner/quotes-finances?tab=contracts"
                          className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                          title={`Go to contract: ${invoice.quote.contracts[0].title}`}
                        >
                          Contract
                        </Link>
                      )}
                    </div>
                    {invoice.due_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due {new Date(invoice.due_date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    {invoice.status !== 'PAID' && invoice.status !== 'DRAFT' && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>{new Intl.NumberFormat('en', { style: 'currency', currency: invoice.currency }).format(paid)} paid</span>
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
                      {new Intl.NumberFormat('en', { style: 'currency', currency: invoice.currency }).format(total)}
                    </span>
                    {paid > 0 && paid < total && (
                      <span className="text-xs text-orange-600 font-medium">
                        {new Intl.NumberFormat('en', { style: 'currency', currency: invoice.currency }).format(total - paid)} due
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                  {isDraft && (
                    <button
                      onClick={() => handleOpenEdit(invoice)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedId(invoice.id); setView('detail'); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    View &amp; Payments
                  </button>
                  <button
                    onClick={() => handleGeneratePdf(invoice)}
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
                        {invoice.pdf_url ? 'Download PDF' : 'Generate PDF'}
                      </>
                    )}
                  </button>

                  {/* Delete only available in DRAFT mode */}
                  {isDraft && (
                    <button
                      onClick={() => handleDelete(invoice.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ml-auto"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <Pagination total={filteredInvoices.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  );
}
