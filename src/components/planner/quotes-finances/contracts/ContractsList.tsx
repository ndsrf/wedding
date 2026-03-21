'use client';

import { useState, useEffect } from 'react';
import { ContractTemplatesList } from '../contract-templates/ContractTemplatesList';

export interface InvoicePrefillData {
  customer_id?: string | null;
  quote_id?: string;
  client_name?: string;
  client_email?: string;
  currency?: string;
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
  created_at: string;
  customer: { id: string; name: string; email: string | null } | null;
  quote: { id: string; couple_names: string; currency: string; total: string | number } | null;
  template: { id: string; name: string } | null;
}

const CONTRACT_STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SHARED: 'bg-blue-100 text-blue-700',
  SIGNING: 'bg-amber-100 text-amber-700',
  SIGNED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SHARED: 'Shared',
  SIGNING: 'Awaiting Signature',
  SIGNED: 'Signed',
  CANCELLED: 'Cancelled',
};

export function ContractsList({ onCreateInvoice }: ContractsListProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [creatingInvoiceId, setCreatingInvoiceId] = useState<string | null>(null);
  const [manualSignId, setManualSignId] = useState<string | null>(null);
  const [manualSignFile, setManualSignFile] = useState<File | null>(null);
  const [manualSignError, setManualSignError] = useState<string | null>(null);
  const [manualSigning, setManualSigning] = useState(false);
  const [sendForm, setSendForm] = useState<{ email: string; name: string; message: string }>({
    email: '',
    name: '',
    message: '',
  });
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  async function fetchContracts() {
    const res = await fetch('/api/planner/contracts');
    if (res.ok) {
      const json = await res.json();
      setContracts(json.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchContracts(); }, []);

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
        body: JSON.stringify(sendForm),
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

  async function handleManualSign(contractId: string, e: React.FormEvent) {
    e.preventDefault();
    if (!manualSignFile) return;
    setManualSignError(null);
    setManualSigning(true);
    try {
      const formData = new FormData();
      formData.append('file', manualSignFile);
      const res = await fetch(`/api/planner/contracts/${contractId}/manual-sign`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setManualSignId(null);
        setManualSignFile(null);
        fetchContracts();
      } else {
        const json = await res.json().catch(() => ({}));
        setManualSignError(json.error ?? `Server error ${res.status}`);
      }
    } catch {
      setManualSignError('Network error — check your connection and try again.');
    } finally {
      setManualSigning(false);
    }
  }

  async function handleGeneratePdf(contractId: string, title: string) {
    setGeneratingPdfId(contractId);
    try {
      const res = await fetch(`/api/planner/contracts/${contractId}/generate-pdf`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        const url = json.data?.pdf_url;
        if (url) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `${title}.pdf`;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    } finally {
      setGeneratingPdfId(null);
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
        client_name: quote.couple_names,
        client_email: quote.client_email ?? '',
        currency: quote.currency,
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

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin w-6 h-6 border-4 border-rose-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Contracts list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Contracts</h3>
          <p className="text-xs text-gray-400">Contracts are created from accepted quotes</p>
        </div>

        {contracts.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No contracts yet</h3>
            <p className="text-xs text-gray-500 mt-1">Accept a quote and create a contract from it to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <div key={contract.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-gray-900">{contract.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CONTRACT_STATUS_STYLES[contract.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      {contract.customer && (
                        <span className="font-medium text-gray-700">{contract.customer.name}</span>
                      )}
                      {contract.quote && (
                        <span>Quote: {contract.quote.couple_names}</span>
                      )}
                      {contract.signer_email && (
                        <span>✉ {contract.signer_email}</span>
                      )}
                      <span>{new Date(contract.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {contract.signed_at && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        Signed {new Date(contract.signed_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {contract.quote && (
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">
                        {new Intl.NumberFormat('en', { style: 'currency', currency: contract.quote.currency }).format(Number(contract.quote.total))}
                      </span>
                    </div>
                  )}
                </div>

                {/* Send-for-signing form (inline) */}
                {sendingId === contract.id && (
                  <form
                    onSubmit={(e) => handleSendForSigning(contract.id, e)}
                    className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-3"
                  >
                    <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Send for Online Signing via DocuSeal</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Signer Email *</label>
                        <input
                          required type="email"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                          value={sendForm.email}
                          onChange={(e) => setSendForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder={contract.signer_email ?? contract.customer?.email ?? ''}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Signer Name *</label>
                        <input
                          required
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                          value={sendForm.name}
                          onChange={(e) => setSendForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder={contract.customer?.name ?? ''}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Message (optional)</label>
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
                        {sending ? 'Sending…' : 'Send'}
                      </button>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => { setSendingId(null); setSendError(null); }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Manual sign form (inline) */}
                {manualSignId === contract.id && (
                  <form
                    onSubmit={(e) => handleManualSign(contract.id, e)}
                    className="mt-3 p-4 bg-violet-50 rounded-xl border border-violet-100 space-y-3"
                  >
                    <h5 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Upload Signed Document</h5>
                    <p className="text-xs text-gray-500">Upload the signed contract (PDF or image) to mark this contract as signed.</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Signed Document *</label>
                      <input
                        required
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200 cursor-pointer"
                        onChange={(e) => {
                          setManualSignFile(e.target.files?.[0] ?? null);
                          setManualSignError(null);
                        }}
                      />
                      <p className="text-[11px] text-gray-400 mt-1">PDF, JPG, PNG or WebP · Max 20 MB</p>
                    </div>
                    {manualSignError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <svg className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-xs text-red-700">{manualSignError}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={manualSigning || !manualSignFile}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        {manualSigning && (
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {manualSigning ? 'Uploading…' : 'Mark as Signed'}
                      </button>
                      <button
                        type="button"
                        disabled={manualSigning}
                        onClick={() => { setManualSignId(null); setManualSignFile(null); setManualSignError(null); }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                  <button
                    onClick={() => openEditor(contract.share_token)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleGeneratePdf(contract.id, contract.title)}
                    disabled={generatingPdfId === contract.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-60 rounded-lg transition-colors"
                    title="Download PDF for manual signing"
                  >
                    {generatingPdfId === contract.id ? (
                      <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    Download PDF
                  </button>
                  <button
                    onClick={() => copyShareLink(contract.id, contract.share_token)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copiedId === contract.id ? (
                      <>
                        <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share Link
                      </>
                    )}
                  </button>
                  {contract.status !== 'SIGNED' && contract.status !== 'CANCELLED' && (
                    <>
                      <button
                        onClick={() => {
                          setSendForm({
                            email: contract.signer_email ?? contract.customer?.email ?? '',
                            name: contract.signer_name ?? contract.customer?.name ?? '',
                            message: '',
                          });
                          setSendError(null);
                          setManualSignId(null);
                          setSendingId(sendingId === contract.id ? null : contract.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Send for Signing
                      </button>
                      <button
                        onClick={() => {
                          setManualSignFile(null);
                          setManualSignError(null);
                          setSendingId(null);
                          setManualSignId(manualSignId === contract.id ? null : contract.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Manually Sign
                      </button>
                    </>
                  )}
                  {contract.status === 'SIGNING' && contract.signing_url && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Awaiting DocuSeal signature
                    </span>
                  )}
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
                      Create Invoice
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
          Contract Templates
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
