'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale, useFormatter } from 'next-intl';
import { ContractTemplatesList } from '../contract-templates/ContractTemplatesList';
import { FilterBar } from '../FilterBar';
import { Pagination } from '../Pagination';

export interface InvoicePrefillData {
  customer_id?: string | null;
  quote_id?: string;
  client_name?: string;
  client_email?: string;
  client_id_number?: string;
  client_address?: string;
  currency?: string;
  discount?: number | '';
  tax_rate?: number | '';
  line_items?: { name: string; description: string; quantity: number; unit_price: number; total: number }[];
}

interface ContractsListProps {
  onCreateInvoice?: (prefill: InvoicePrefillData) => void;
}

interface Contract {
  id: string;
  title: string;
  status: string;
  signer_email: string | null;
  signer_name: string | null;
  share_token: string;
  signing_url: string | null;
  signed_at: string | null;
  pdf_url: string | null;
  signed_pdf_url: string | null;
  created_at: string;
  customer: { id: string; name: string; couple_names: string | null; email: string | null } | null;
  quote: { id: string; couple_names: string; event_date: string | null; currency: string; total: string | number } | null;
  template: { id: string; name: string } | null;
}

const CONTRACT_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SHARED: 'bg-blue-100 text-blue-700',
  SIGNING: 'bg-amber-100 text-amber-700',
  SIGNED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function ContractsList({ onCreateInvoice }: ContractsListProps) {
  const t = useTranslations('planner.quotesFinances');
  const locale = useLocale();
  const format = useFormatter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [creatingInvoiceId, setCreatingInvoiceId] = useState<string | null>(null);
  const [creatingWeddingId, setCreatingWeddingId] = useState<string | null>(null);
  const [movingToDraftId, setMovingToDraftId] = useState<string | null>(null);
  const [sendForm, setSendForm] = useState<{ email: string; name: string; message: string }>({
    email: '',
    name: '',
    message: '',
  });
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [manualSigningId, setManualSigningId] = useState<string | null>(null);
  const manualSignInputRef = useRef<HTMLInputElement | null>(null);
  const [manualSignTarget, setManualSignTarget] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  async function fetchContracts() {
    const res = await fetch('/api/planner/contracts');
    if (res.ok) {
      const json = await res.json();
      setContracts(json.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchContracts(); }, []);

  // Refresh when the user returns to this tab (e.g. after editing a contract in a new tab)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') fetchContracts();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  function openEditor(shareToken: string) {
    window.open(`/planner/contracts/${shareToken}`, '_blank');
  }

  function copyShareLink(contractId: string, shareToken: string) {
    const url = `${window.location.origin}/c/${shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(contractId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  }

  async function handleSendForSigning(contractId: string, e: React.FormEvent) {
    e.preventDefault();
    setSendError(null);
    setSending(true);
    try {
      const res = await fetch(`/api/planner/contracts/${contractId}/send-for-signing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signer_email: sendForm.email, signer_name: sendForm.name, message: sendForm.message }),
      });
      if (res.ok) {
        setSendingId(null);
        fetchContracts();
      } else {
        const json = await res.json().catch(() => ({}));
        const msg = json.error ?? `Server error ${res.status}`;
        setSendError(msg);
      }
    } catch {
      setSendError('Network error — check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  async function handleMoveToDraft(contractId: string) {
    if (!confirm('Move this contract back to Draft? This will cancel the pending DocuSeal signature request.')) return;
    setMovingToDraftId(contractId);
    try {
      const res = await fetch(`/api/planner/contracts/${contractId}/move-to-draft`, { method: 'POST' });
      if (res.ok) {
        fetchContracts();
      }
    } finally {
      setMovingToDraftId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this contract?')) return;
    try {
      const res = await fetch(`/api/planner/contracts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchContracts();
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? 'Failed to delete contract');
      }
    } catch {
      alert('Network error — could not delete contract');
    }
  }

  async function handleDownloadPdf(contract: Contract) {
    // For signed contracts, return the signed DocuSeal PDF
    if (contract.status === 'SIGNED' && contract.signed_pdf_url) {
      window.open(contract.signed_pdf_url, '_blank');
      return;
    }

    // If we have a cached PDF URL, just open it
    if (contract.pdf_url) {
      window.open(contract.pdf_url, '_blank');
      return;
    }

    // Generate the PDF
    setGeneratingPdfId(contract.id);
    try {
      const res = await fetch(`/api/planner/contracts/${contract.id}/generate-pdf`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        const url = json.data?.pdf_url;
        if (url) {
          window.open(url, '_blank');
          fetchContracts();
        }
      }
    } finally {
      setGeneratingPdfId(null);
    }
  }

  async function handleDownloadAudit(contractId: string) {
    const res = await fetch(`/api/planner/contracts/${contractId}/audit-pdf`);
    if (res.ok) {
      const json = await res.json();
      if (json.data?.audit_url) {
        window.open(json.data.audit_url, '_blank');
      }
    }
  }

  async function handleManualSignUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !manualSignTarget) return;
    setManualSigningId(manualSignTarget);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/planner/contracts/${manualSignTarget}/manual-sign`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchContracts();
      }
    } finally {
      setManualSigningId(null);
      setManualSignTarget(null);
      if (manualSignInputRef.current) manualSignInputRef.current.value = '';
    }
  }

  async function handleCreateInvoice(contract: Contract) {
    if (!contract.quote || !onCreateInvoice) return;
    setCreatingInvoiceId(contract.id);
    try {
      const res = await fetch(`/api/planner/quotes/${contract.quote.id}`);
      if (!res.ok) return;
      const { data: quote } = await res.json();
      onCreateInvoice({
        customer_id: quote.customer_id ?? null,
        quote_id: quote.id,
        client_name: quote.customer?.name ?? quote.couple_names,
        client_email: quote.customer?.email ?? '',
        client_id_number: quote.customer?.id_number ?? '',
        client_address: quote.customer?.address ?? '',
        currency: quote.currency,
        discount: quote.discount != null ? Number(quote.discount) : '',
        tax_rate: quote.tax_rate != null ? Number(quote.tax_rate) : '',
        line_items: (quote.line_items ?? []).map((li: { name: string; description: string | null; quantity: unknown; unit_price: unknown; total: unknown }) => ({
          name: li.name,
          description: li.description ?? '',
          quantity: Number(li.quantity),
          unit_price: Number(li.unit_price),
          total: Number(li.total),
        })),
      });
    } finally {
      setCreatingInvoiceId(null);
    }
  }

  async function handleCreateWedding(contract: Contract) {
    setCreatingWeddingId(contract.id);
    try {
      const params = new URLSearchParams({ action: 'create', contract_id: contract.id });
      if (contract.customer) {
        params.set('customer_id', contract.customer.id);
        params.set('customer_name', contract.customer.name);
        const coupleNames = contract.customer.couple_names ?? contract.quote?.couple_names ?? contract.customer.name;
        params.set('couple_names', coupleNames);
      }
      if (contract.quote?.event_date) params.set('event_date', contract.quote.event_date);
      window.location.href = `/planner/weddings?${params.toString()}`;
    } finally {
      setCreatingWeddingId(null);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin w-6 h-6 border-4 border-rose-500 border-t-transparent rounded-full" />
    </div>
  );

  const filteredContracts = contracts.filter((c) => {
    const nameMatch = nameFilter.trim() === '' ||
      c.title.toLowerCase().includes(nameFilter.toLowerCase()) ||
      (c.customer?.name ?? '').toLowerCase().includes(nameFilter.toLowerCase());
    const statusMatch = statusFilter.length === 0 || statusFilter.includes(c.status);
    return nameMatch && statusMatch;
  });
  const pagedContracts = filteredContracts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const CONTRACT_STATUS_OPTIONS = [
    { value: 'DRAFT', label: t('contracts.status.DRAFT') },
    { value: 'SHARED', label: t('contracts.status.SHARED') },
    { value: 'SIGNING', label: t('contracts.status.SIGNING') },
    { value: 'SIGNED', label: t('contracts.status.SIGNED') },
    { value: 'CANCELLED', label: t('contracts.status.CANCELLED') },
  ];

  return (
    <div className="space-y-6">
      {/* Hidden file input for manual signing */}
      <input
        ref={manualSignInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleManualSignUpload}
      />

      {/* Contracts list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">{t('contracts.title')}</h3>
          <p className="text-xs text-gray-400">{t('contracts.subtitle')}</p>
        </div>

        <FilterBar
          nameValue={nameFilter}
          onNameChange={(v) => { setNameFilter(v); setPage(1); }}
          namePlaceholder={t('contracts.searchPlaceholder')}
          statusOptions={CONTRACT_STATUS_OPTIONS}
          selectedStatuses={statusFilter}
          onStatusChange={(s) => { setStatusFilter(s); setPage(1); }}
          statusLabel={t('filterBar.status')}
          clearFiltersLabel={t('filterBar.clearFilters')}
        />

        {filteredContracts.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
            {nameFilter || statusFilter.length > 0 ? (
              <>
                <h3 className="text-sm font-semibold text-gray-900">{t('contracts.noMatch')}</h3>
                <p className="text-xs text-gray-500 mt-1">{t('contracts.noMatchHint')}</p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-900">{t('contracts.empty')}</h3>
                <p className="text-xs text-gray-500 mt-1">{t('contracts.emptyHint')}</p>
              </>
            )}
          </div>
        ) : (
          <>
          <div className="space-y-3">
            {pagedContracts.map((contract) => (
              <div key={contract.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-gray-900">{contract.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CONTRACT_STATUS_STYLES[contract.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {t(`contracts.status.${contract.status}` as Parameters<typeof t>[0])}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      {contract.customer && (
                        <span className="font-medium text-gray-700">{contract.customer.name}</span>
                      )}
                      {contract.quote && (
                        <span>{t('contracts.quotePrefix')} {contract.quote.couple_names}</span>
                      )}
                      {contract.signer_email && (
                        <span>✉ {contract.signer_email}</span>
                      )}
                      <span>{format.dateTime(new Date(contract.created_at), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {contract.signed_at && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        {t('contracts.signed', { date: new Date(contract.signed_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) })}
                      </p>
                    )}
                  </div>
                  {contract.quote && (
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">
                        {format.number(Number(contract.quote.total), { style: 'currency', currency: contract.quote.currency })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Send-for-signing form (inline) — only in DRAFT status */}
                {sendingId === contract.id && (
                  <form
                    onSubmit={(e) => handleSendForSigning(contract.id, e)}
                    className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3"
                  >
                    <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t('contracts.sendForm.heading')}</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('contracts.sendForm.signerEmail')}</label>
                        <input
                          required type="email"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                          value={sendForm.email}
                          onChange={(e) => setSendForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder={contract.signer_email ?? contract.customer?.email ?? ''}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('contracts.sendForm.signerName')}</label>
                        <input
                          required
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                          value={sendForm.name}
                          onChange={(e) => setSendForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder={contract.customer?.name ?? ''}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('contracts.sendForm.message')}</label>
                        <textarea
                          rows={2}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                          value={sendForm.message}
                          onChange={(e) => setSendForm((p) => ({ ...p, message: e.target.value }))}
                        />
                      </div>
                    </div>
                    {sendError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <svg className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-xs text-red-700">{sendError}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={sending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        {sending && (
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {sending ? t('contracts.sendForm.sending') : t('contracts.sendForm.send')}
                      </button>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => { setSendingId(null); setSendError(null); }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
                      >
                        {t('contracts.sendForm.cancel')}
                      </button>
                    </div>
                  </form>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                  {/* Edit only in DRAFT; otherwise View */}
                  {contract.status === 'DRAFT' ? (
                    <button
                      onClick={() => openEditor(contract.share_token)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {t('contracts.edit')}
                    </button>
                  ) : (
                    <button
                      onClick={() => openEditor(contract.share_token)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {t('contracts.view')}
                    </button>
                  )}

                  {/* Download PDF — shows signed PDF if signed */}
                  <button
                    onClick={() => handleDownloadPdf(contract)}
                    disabled={generatingPdfId === contract.id}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-60 ${
                      contract.status === 'SIGNED' || contract.pdf_url
                        ? 'text-gray-700 bg-gray-50 hover:bg-gray-100'
                        : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                    }`}
                    title={contract.status === 'SIGNED' ? 'Download signed PDF' : (contract.pdf_url ? 'Download PDF' : 'PDF needs to be generated')}
                  >
                    {generatingPdfId === contract.id ? (
                      <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {contract.status === 'SIGNED' ? t('contracts.downloadSignedPdf') : (contract.pdf_url ? t('contracts.downloadPdf') : t('contracts.generatePdf'))}
                  </button>

                  {/* Audit PDF — only for SIGNED contracts with DocuSeal */}
                  {contract.status === 'SIGNED' && contract.signed_pdf_url && (
                    <button
                      onClick={() => handleDownloadAudit(contract.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      title="Download audit trail PDF"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      {t('contracts.audit')}
                    </button>
                  )}

                  <button
                    onClick={() => copyShareLink(contract.id, contract.share_token)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copiedId === contract.id ? (
                      <>
                        <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-700">{t('contracts.copied')}</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        {t('contracts.shareLink')}
                      </>
                    )}
                  </button>

                  {/* DRAFT: Send for Signing + Manual Sign */}
                  {contract.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => {
                          setSendForm({
                            email: contract.signer_email ?? contract.customer?.email ?? '',
                            name: contract.signer_name ?? contract.customer?.name ?? '',
                            message: '',
                          });
                          setSendError(null);
                          setSendingId(sendingId === contract.id ? null : contract.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {t('contracts.sendForSigning')}
                      </button>
                      <button
                        disabled={manualSigningId === contract.id}
                        onClick={() => {
                          setManualSignTarget(contract.id);
                          manualSignInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-60 rounded-lg transition-colors"
                        title="Upload a pre-signed PDF or image"
                      >
                        {manualSigningId === contract.id ? (
                          <span className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        )}
                        {t('contracts.manualSign')}
                      </button>

                      {/* Delete only in DRAFT mode */}
                      <button
                        onClick={() => handleDelete(contract.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ml-auto"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {t('contracts.delete')}
                      </button>
                    </>
                  )}

                  {/* SIGNING: Move to Draft (cancel DocuSeal), no edit, no manually sign */}
                  {contract.status === 'SIGNING' && (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {t('contracts.awaitingDocuSeal')}
                      </span>
                      <button
                        onClick={() => handleMoveToDraft(contract.id)}
                        disabled={movingToDraftId === contract.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-60 rounded-lg transition-colors"
                      >
                        {movingToDraftId === contract.id ? (
                          <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        )}
                        {t('contracts.moveToDraft')}
                      </button>
                    </>
                  )}

                  {/* SIGNED: Create Invoice + Create Wedding */}
                  {contract.status === 'SIGNED' && contract.quote && onCreateInvoice && (
                    <button
                      onClick={() => handleCreateInvoice(contract)}
                      disabled={creatingInvoiceId === contract.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 rounded-lg transition-colors ml-auto"
                    >
                      {creatingInvoiceId === contract.id ? (
                        <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      )}
                      {t('contracts.createInvoice')}
                    </button>
                  )}
                  {contract.status === 'SIGNED' && (
                    <button
                      onClick={() => handleCreateWedding(contract)}
                      disabled={creatingWeddingId === contract.id}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 rounded-lg transition-colors ${!(contract.status === 'SIGNED' && contract.quote && onCreateInvoice) ? 'ml-auto' : ''}`}
                    >
                      {creatingWeddingId === contract.id ? (
                        <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      )}
                      {t('contracts.createWedding')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination total={filteredContracts.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Templates section */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={() => setShowTemplates((p) => !p)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className={`h-4 w-4 transition-transform ${showTemplates ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {t('contracts.contractTemplates')}
        </button>
        {showTemplates && (
          <div className="mt-4">
            <ContractTemplatesList />
          </div>
        )}
      </div>
    </div>
  );
}
