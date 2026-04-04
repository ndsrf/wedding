'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { QuoteForm } from './QuoteForm';
import { FilterBar } from '../FilterBar';
import { Pagination } from '../Pagination';

interface LineItem {
  id?: string;
  name: string;
  description: string | null;
  quantity: number | string;
  unit_price: number | string;
  total: number | string;
}

interface Quote {
  id: string;
  customer_id: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null; id_number: string | null; address: string | null; notes: string | null } | null;
  couple_names: string;
  event_date: string | null;
  location: string | null;
  notes: string | null;
  currency: string;
  subtotal: string | number;
  discount: string | number | null;
  tax_rate: string | number | null;
  total: string | number;
  expires_at: string | null;
  pdf_url: string | null;
  status: string;
  version: number;
  previous_version_id: string | null;
  created_at: string;
  line_items: LineItem[];
  contracts: { id: string; status: string; share_token?: string; signed_pdf_url?: string | null }[];
  invoices: { id: string; status: string }[];
}

interface ContractTemplate {
  id: string;
  name: string;
  is_default: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
};

const CONTRACT_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'text-gray-500',
  SHARED: 'text-blue-600',
  SIGNING: 'text-amber-600',
  SIGNED: 'text-green-600',
  CANCELLED: 'text-red-500',
};

export function QuotesList() {
  const t = useTranslations('planner.quotesFinances');
  const format = useFormatter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Contract creation state
  const [contractQuoteId, setContractQuoteId] = useState<string | null>(null);
  const [contractTitle, setContractTitle] = useState('');
  const [contractTemplateId, setContractTemplateId] = useState('');
  const [contractFillWithAI, setContractFillWithAI] = useState(false);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [creatingContract, setCreatingContract] = useState(false);

  async function fetchQuotes() {
    const res = await fetch('/api/planner/quotes');
    if (res.ok) {
      const json = await res.json();
      setQuotes(json.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchQuotes(); }, []);

  async function fetchTemplates() {
    if (templates.length > 0) return;
    const res = await fetch('/api/planner/contract-templates');
    if (res.ok) {
      const json = await res.json();
      setTemplates(json.data ?? []);
      const def = (json.data ?? []).find((t: ContractTemplate) => t.is_default);
      if (def) setContractTemplateId(def.id);
    }
  }

  function openCreateContract(quote: Quote) {
    setContractTitle(`Contract – ${quote.couple_names}`);
    setContractTemplateId('');
    setContractFillWithAI(false);
    setContractQuoteId(quote.id);
    fetchTemplates();
  }

  async function handleCreateContract(e: React.FormEvent) {
    e.preventDefault();
    if (!contractQuoteId) return;
    setCreatingContract(true);
    const res = await fetch(`/api/planner/quotes/${contractQuoteId}/contract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: contractTitle,
        contract_template_id: contractTemplateId || null,
      }),
    });
    if (!res.ok) { setCreatingContract(false); return; }
    const json = await res.json();

    if (contractFillWithAI && json.data?.id) {
      try {
        const fillRes = await fetch(`/api/planner/contracts/${json.data.id}/fill-with-ai`, { method: 'POST' });
        if (fillRes.ok) {
          const fillJson = await fillRes.json();
          if (fillJson.data?.comments?.length) {
            localStorage.setItem(
              `contract-ai-comments-${json.data.id}`,
              JSON.stringify(fillJson.data.comments),
            );
          }
        }
      } catch {
        // Non-fatal: open editor without AI comments
      }
    }

    setCreatingContract(false);
    setContractQuoteId(null);
    fetchQuotes();
    window.open(`/planner/contracts/${json.data.share_token}`, '_blank');
  }

  async function handleSave(data: Record<string, unknown>) {
    if (editingId) {
      await fetch(`/api/planner/quotes/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      // Immediately clear pdf_url in local state so the UI reflects that it needs regeneration
      setQuotes((prev) => prev.map((q) => q.id === editingId ? { ...q, pdf_url: null } : q));
    } else {
      await fetch('/api/planner/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    setShowForm(false);
    setEditingId(null);
    fetchQuotes();
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/planner/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchQuotes();
  }

  async function handlePdf(quote: Quote) {
    // If PDF already exists and quote hasn't changed, just open it
    if (quote.pdf_url) {
      window.open(quote.pdf_url, '_blank');
      return;
    }
    // Otherwise generate it
    setGenerating(quote.id);
    const res = await fetch(`/api/planner/quotes/${quote.id}/generate-pdf`, { method: 'POST' });
    if (res.ok) {
      const { data } = await res.json();
      window.open(data.pdf_url, '_blank');
      fetchQuotes();
    }
    setGenerating(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this quote?')) return;
    await fetch(`/api/planner/quotes/${id}`, { method: 'DELETE' });
    fetchQuotes();
  }

  async function handleNewVersion(id: string) {
    const res = await fetch(`/api/planner/quotes/${id}/new-version`, { method: 'POST' });
    if (res.ok) {
      fetchQuotes();
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin w-6 h-6 border-4 border-rose-500 border-t-transparent rounded-full" />
    </div>
  );

  const editingQuote = editingId ? quotes.find((q) => q.id === editingId) : null;
  const viewingQuote = viewingId ? quotes.find((q) => q.id === viewingId) : null;

  const filteredQuotes = quotes.filter((q) => {
    const nameMatch = nameFilter.trim() === '' || q.couple_names.toLowerCase().includes(nameFilter.toLowerCase());
    const statusMatch = statusFilter.length === 0 || statusFilter.includes(q.status);
    return nameMatch && statusMatch;
  });
  const pagedQuotes = filteredQuotes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const QUOTE_STATUS_OPTIONS = [
    { value: 'DRAFT', label: t('quotes.status.DRAFT') },
    { value: 'SENT', label: t('quotes.status.SENT') },
    { value: 'ACCEPTED', label: t('quotes.status.ACCEPTED') },
    { value: 'REJECTED', label: t('quotes.status.REJECTED') },
    { value: 'EXPIRED', label: t('quotes.status.EXPIRED') },
  ];

  if (showForm) {
    const isView = viewingId !== null && editingId === null;
    const quoteData = editingQuote ?? viewingQuote;
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setShowForm(false); setEditingId(null); setViewingId(null); }} className="text-sm text-gray-500 hover:text-gray-700">
            {t('quotes.back')}
          </button>
          <h3 className="text-base font-semibold text-gray-900">
            {isView ? t('quotes.viewQuote') : editingId ? t('quotes.editQuote') : t('quotes.newQuote')}
          </h3>
        </div>
        <QuoteForm
          readOnly={isView}
          initialData={quoteData ? {
            customer_id: quoteData.customer_id ?? null,
            couple_names: quoteData.couple_names,
            event_date: quoteData.event_date ?? '',
            location: quoteData.location ?? '',
            client_email: quoteData.customer?.email ?? '',
            client_phone: quoteData.customer?.phone ?? '',
            client_id_number: quoteData.customer?.id_number ?? '',
            client_address: quoteData.customer?.address ?? '',
            notes: quoteData.notes ?? '',
            currency: quoteData.currency,
            discount: quoteData.discount != null ? Number(quoteData.discount) : '',
            tax_rate: quoteData.tax_rate != null ? Number(quoteData.tax_rate) : '',
            expires_at: quoteData.expires_at ?? '',
            line_items: quoteData.line_items.map((li) => ({
              id: li.id,
              name: li.name,
              description: li.description ?? '',
              quantity: Number(li.quantity),
              unit_price: Number(li.unit_price),
              total: Number(li.total),
            })),
          } : undefined}
          onSave={isView ? async () => {} : handleSave}
          onCancel={() => { setShowForm(false); setEditingId(null); setViewingId(null); }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">{t('quotes.title')}</h3>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setViewingId(null); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('quotes.newQuote')}
        </button>
      </div>

      <FilterBar
        nameValue={nameFilter}
        onNameChange={(v) => { setNameFilter(v); setPage(1); }}
        namePlaceholder={t('quotes.searchPlaceholder')}
        statusOptions={QUOTE_STATUS_OPTIONS}
        selectedStatuses={statusFilter}
        onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
        statusLabel={t('filterBar.status')}
        clearFiltersLabel={t('filterBar.clearFilters')}
      />

      {filteredQuotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          {nameFilter || statusFilter.length > 0 ? (
            <>
              <h3 className="text-sm font-semibold text-gray-900">{t('quotes.noMatch')}</h3>
              <p className="text-xs text-gray-500 mt-1">{t('quotes.noMatchHint')}</p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-gray-900">{t('quotes.empty')}</h3>
              <p className="text-xs text-gray-500 mt-1">{t('quotes.emptyHint')}</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all"
              >
                {t('quotes.createQuote')}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
        <div className="space-y-3">
          {pagedQuotes.map((quote) => (
            <div key={quote.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-gray-900">{quote.couple_names}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[quote.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t(`quotes.status.${quote.status}` as Parameters<typeof t>[0])}
                    </span>
                    {quote.version > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                        v{quote.version}
                      </span>
                    )}
                    {quote.contracts.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {quote.contracts.length === 1 ? t('quotes.contractBadge') : t('quotes.contractsBadge', { count: quote.contracts.length })}
                      </span>
                    )}
                    {quote.invoices.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{t('quotes.invoicedBadge')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    {quote.event_date && <span>{format.dateTime(new Date(quote.event_date), { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    {quote.location && <span>📍 {quote.location}</span>}
                    {quote.customer?.email && <span>✉ {quote.customer.email}</span>}
                  </div>

                  {/* Existing contracts for this quote */}
                  {quote.contracts.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {quote.contracts.map((c) => {
                        const href = c.status === 'SIGNED' && c.signed_pdf_url
                          ? c.signed_pdf_url
                          : c.share_token ? `/planner/contracts/${c.share_token}` : '#';
                        return (
                          <a
                            key={c.id}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 ${CONTRACT_STATUS_STYLES[c.status] ?? 'text-gray-500'}`}
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            {t('quotes.contractStatusLabel', { status: t(`contracts.status.${c.status}` as Parameters<typeof t>[0]) })}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    {format.number(Number(quote.total), { style: 'currency', currency: quote.currency })}
                  </span>
                  {quote.expires_at && new Date(quote.expires_at) < new Date() && quote.status !== 'EXPIRED' && (
                    <span className="text-xs text-orange-500">{t('quotes.expiredLabel')}</span>
                  )}
                </div>
              </div>

              {/* Create contract inline form */}
              {contractQuoteId === quote.id && (
                <form
                  onSubmit={handleCreateContract}
                  className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-3"
                >
                  <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('quotes.contractForm.heading')}</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">{t('quotes.contractForm.titleField')}</label>
                      <input
                        required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                        value={contractTitle}
                        onChange={(e) => setContractTitle(e.target.value)}
                      />
                    </div>
                    {templates.length > 0 && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('quotes.contractForm.template')}</label>
                        <select
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                          value={contractTemplateId}
                          onChange={(e) => setContractTemplateId(e.target.value)}
                        >
                          <option value="">{t('quotes.contractForm.blankContract')}</option>
                          {templates.map((tmpl) => (
                            <option key={tmpl.id} value={tmpl.id}>{tmpl.name}{tmpl.is_default ? ` ${t('quotes.contractForm.defaultSuffix')}` : ''}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-300"
                      checked={contractFillWithAI}
                      onChange={(e) => setContractFillWithAI(e.target.checked)}
                    />
                    <span className="text-xs font-medium text-purple-700">{t('quotes.contractForm.fillWithAI')}</span>
                    <span className="text-xs text-gray-400">{t('quotes.contractForm.fillWithAIHint')}</span>
                    </label>                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={creatingContract}
                      className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${
                        creatingContract && contractFillWithAI
                          ? 'ai-magic-button-loading'
                          : 'bg-purple-600 hover:bg-purple-700'
                      } disabled:opacity-50`}
                    >
                      {creatingContract
                        ? contractFillWithAI ? t('quotes.contractForm.fillingWithAI') : t('quotes.contractForm.creating')
                        : t('quotes.contractForm.createAndOpen')}
                    </button>                    <button
                      type="button"
                      onClick={() => setContractQuoteId(null)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {t('quotes.contractForm.cancel')}
                    </button>
                  </div>
                </form>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                <button
                  onClick={() => handlePdf(quote)}
                  disabled={generating === quote.id}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    quote.pdf_url
                      ? 'text-gray-700 bg-gray-50 hover:bg-gray-100'
                      : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                  }`}
                  title={quote.pdf_url ? 'Download existing PDF' : 'PDF needs to be generated'}
                >
                  {generating === quote.id ? (
                    <span className="animate-spin w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" />
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {quote.pdf_url ? t('quotes.downloadPdf') : t('quotes.generatePdf')}
                </button>

                {/* Edit only in DRAFT mode; otherwise View */}
                {quote.status === 'DRAFT' ? (
                  <button
                    onClick={() => { setEditingId(quote.id); setViewingId(null); setShowForm(true); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {t('quotes.edit')}
                  </button>
                ) : (
                  <button
                    onClick={() => { setViewingId(quote.id); setEditingId(null); setShowForm(true); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {t('quotes.view')}
                  </button>
                )}

                {quote.status === 'DRAFT' && (
                  <button
                    onClick={() => handleStatusChange(quote.id, 'SENT')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    {t('quotes.markSent')}
                  </button>
                )}
                {quote.status === 'SENT' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(quote.id, 'ACCEPTED')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      {t('quotes.accept')}
                    </button>
                    <button
                      onClick={() => handleStatusChange(quote.id, 'REJECTED')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      {t('quotes.reject')}
                    </button>
                  </>
                )}
                {quote.status === 'REJECTED' && (
                  <button
                    onClick={() => handleNewVersion(quote.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    {t('quotes.newVersion')}
                  </button>
                )}
                {quote.status === 'ACCEPTED' && (
                  <button
                    onClick={() => openCreateContract(quote)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    {t('quotes.newContract')}
                  </button>
                )}

                {/* Delete only in DRAFT mode */}
                {quote.status === 'DRAFT' && (
                  <button
                    onClick={() => handleDelete(quote.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ml-auto"
                  >
                    {t('quotes.delete')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <Pagination total={filteredQuotes.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
