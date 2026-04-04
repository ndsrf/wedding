'use client';

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import * as Y from 'yjs';
import { useTranslations } from 'next-intl';
import { ContractEditor } from '@/components/planner/quotes-finances/contracts/ContractEditor';
import { ContractCommentsSidebar, type CommentData } from '@/components/planner/quotes-finances/contracts/ContractCommentsSidebar';
import { ContractHistoryPanel } from '@/components/planner/quotes-finances/contracts/ContractHistoryPanel';

interface ContractData {
  id: string;
  title: string;
  content: object;
  status: string;
  planner: { name: string };
  signed_at: string | null;
  signing_url: string | null;
}

interface QuoteRef {
  couple_names: string;
  customer: { email: string | null } | null;
}

interface CreateWeddingDialogProps {
  coupleNames: string;
  contractId: string;
  customerId: string | null;
  onClose: () => void;
}

function CreateWeddingDialog({ coupleNames, contractId, customerId, onClose }: CreateWeddingDialogProps) {
  const t = useTranslations('planner.quotesFinances.contractPage');
  type Fields = { couple_names: string; wedding_date: string; wedding_time: string; rsvp_cutoff_date: string };
  const [fields, setFields] = useState<Fields>({
    couple_names: coupleNames,
    wedding_date: '',
    wedding_time: '12:00',
    rsvp_cutoff_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof Fields, value: string) {
    setFields((prev: Fields) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/planner/weddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_names: fields.couple_names,
          wedding_date: fields.wedding_date,
          wedding_time: fields.wedding_time,
          rsvp_cutoff_date: fields.rsvp_cutoff_date,
          payment_tracking_mode: 'MANUAL',
          allow_guest_additions: true,
          default_language: 'ES',
          whatsapp_mode: 'BUSINESS',
          // Traceability / billing links
          contract_id: contractId,
          ...(customerId ? { customer_id: customerId } : {}),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? t('failedToCreate'));
        return;
      }
      const json = await res.json();
      const weddingId = json.data?.id;
      onClose();
      if (weddingId) window.open(`/planner/weddings/${weddingId}`, '_blank');
    } catch {
      setError(t('failedToCreate'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">{t('createWeddingTitle')}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('coupleNames')}</label>
            <input
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={fields.couple_names}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('couple_names', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('weddingDate')}</label>
              <input
                required
                type="date"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                value={fields.wedding_date}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('wedding_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('time')}</label>
              <input
                required
                type="time"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                value={fields.wedding_time}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('wedding_time', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('rsvpCutoff')}</label>
            <input
              required
              type="date"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={fields.rsvp_cutoff_date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('rsvp_cutoff_date', e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
            >
              {saving ? t('creating') : t('createWedding')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SHARED: 'bg-blue-100 text-blue-700',
  SIGNING: 'bg-amber-100 text-amber-700',
  SIGNED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};


const STATUS_KEY: Record<string, string> = {
  DRAFT: 'statusDraft',
  SHARED: 'statusShared',
  SIGNING: 'statusSigning',
  SIGNED: 'statusSigned',
  CANCELLED: 'statusCancelled',
};

export default function PlannerContractPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const t = useTranslations('planner.quotesFinances.contractPage');
  const [shareToken, setShareToken] = useState('');
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plannerName, setPlannerName] = useState('Planner');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [quote, setQuote] = useState<QuoteRef | null>(null);
  const [contractCustomerId, setContractCustomerId] = useState<string | null>(null);
  const [contractTemplateId, setContractTemplateId] = useState<string | null>(null);
  const [showCreateWedding, setShowCreateWedding] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const lastEditLogRef = useRef<number>(0);

  // Shared Y.Doc: editor + comments sidebar share the same Liveblocks connection
  const ydocRef = useRef<Y.Doc>(new Y.Doc());

  function handleYDocReady(ydoc: Y.Doc) {
    if (!contract?.id) return;
    const key = `contract-ai-comments-${contract.id}`;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return;
      const comments = JSON.parse(stored) as import('@/components/planner/quotes-finances/contracts/ContractCommentsSidebar').CommentData[];
      if (!Array.isArray(comments) || comments.length === 0) return;
      const commentsArray = ydoc.getArray<import('@/components/planner/quotes-finances/contracts/ContractCommentsSidebar').CommentData>('comments');
      // Only inject if comments array is currently empty (don't duplicate on re-opens)
      if (commentsArray.length === 0) {
        commentsArray.push(comments);
      }
      localStorage.removeItem(key);
    } catch {
      // Non-fatal
    }
  }

  useEffect(() => {
    params.then((p) => setShareToken(p.shareToken));
  }, [params]);

  useEffect(() => {
    if (!shareToken) return;

    // Fire-and-forget planner name fetch
    fetch('/api/planner/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => { if (res?.name) setPlannerName(res.name); })
      .catch(() => {});

    // Sequential: fetch contract → silently apply template rules → init editor
    (async () => {
      try {
        const r = await fetch(`/api/planner/contracts/shared/${shareToken}`);
        const res = await r.json();
        if (res.error) { setError(res.error); return; }

        let contractData = res.data as ContractData;

        // Apply remembered placeholder rules before the editor initialises so the
        // filled content is what gets rendered — no comments generated.
        if (contractData?.id) {
          try {
            const fillRes = await fetch(`/api/planner/contracts/${contractData.id}/apply-template-rules`, { method: 'POST' });
            if (fillRes.ok) {
              const fillJson = await fillRes.json();
              if (fillJson.data?.filledCount > 0 && fillJson.data?.content) {
                contractData = { ...contractData, content: fillJson.data.content };
              }
            }
          } catch {
            // Non-fatal — editor falls back to the un-filled content
          }
        }

        setContract(contractData);
      } catch {
        setError(t('failedToLoad'));
      } finally {
        setLoading(false);
      }
    })();
  }, [shareToken]);

  // Once we have the contract id, fetch the planner-authenticated details to get quote data
  useEffect(() => {
    if (!contract?.id) return;
    fetch(`/api/planner/contracts/${contract.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res?.data?.quote) setQuote(res.data.quote);
        if (res?.data?.customer_id) setContractCustomerId(res.data.customer_id);
        if (res?.data?.contract_template_id) setContractTemplateId(res.data.contract_template_id);
      })
      .catch(() => {});
  }, [contract?.id]);

  async function logHistoryEvent(payload: {
    event_type: 'edit' | 'comment_added' | 'comment_resolved';
    description?: string;
    actor_name?: string;
    actor_color?: string;
  }) {
    if (!contract) return;
    fetch(`/api/planner/contracts/${contract.id}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor_name: payload.actor_name ?? plannerName,
        actor_color: payload.actor_color ?? '#e11d48',
        event_type: payload.event_type,
        description: payload.description,
      }),
    }).catch(() => {});
  }

  async function handleSaveContent(content: object) {
    if (!contract) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/planner/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      // Log edit event at most once per 60 seconds to avoid flooding the log
      const now = Date.now();
      if (now - lastEditLogRef.current > 60_000) {
        lastEditLogRef.current = now;
        logHistoryEvent({ event_type: 'edit' });
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  function handleCommentAdded(comment: CommentData) {
    logHistoryEvent({
      event_type: 'comment_added',
      description: comment.text.length > 120 ? comment.text.slice(0, 120) + '…' : comment.text,
    });
  }

  function handleCommentResolved(resolvedComments: CommentData[]) {
    const names = resolvedComments.map((c) => `"${c.text.slice(0, 60)}${c.text.length > 60 ? '…' : ''}"`).join(', ');
    logHistoryEvent({
      event_type: 'comment_resolved',
      description: resolvedComments.length === 1 ? names : `${resolvedComments.length} comments resolved`,
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('contractNotFound')}</h1>
          <p className="text-gray-500">{error ?? t('linkExpired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => window.close()}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Close tab"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-gray-900 font-playfair truncate">{contract.title}</h1>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[contract.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_KEY[contract.status] ? t(STATUS_KEY[contract.status] as Parameters<typeof t>[0]) : contract.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 text-xs">
            {saving && <span className="text-gray-400">{t('saving')}</span>}
            {saved && <span className="text-green-600 font-medium">{t('saved')}</span>}
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                showHistory
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="View change history"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
            <button
              onClick={() => setShowCreateWedding(true)}
              className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 transition-colors"
              title="Create a wedding from this contract"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('createWedding')}
            </button>
          </div>
        </div>
      </div>

      {/* Editor + comments sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1 min-w-0">
          <ContractEditor
            contractId={contract.id}
            initialContent={contract.content}
            readOnly={contract.status === 'SIGNED'}
            onChange={handleSaveContent}
            externalYdocRef={ydocRef}
            onYDocReady={handleYDocReady}
            currentUser={{ id: 'planner', name: plannerName, color: '#e11d48' }}
          />
        </div>

        <div className="w-full lg:w-72 lg:flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden lg:flex lg:flex-col">
            {showHistory ? (
              <ContractHistoryPanel
                contractId={contract.id}
                onClose={() => setShowHistory(false)}
              />
            ) : (
              <ContractCommentsSidebar
                ydocRef={ydocRef}
                authorName={plannerName}
                authorColor="#e11d48"
                isPlanner
                contractTemplateId={contractTemplateId}
                onCommentAdded={handleCommentAdded}
                onCommentResolved={handleCommentResolved}
              />
            )}
          </div>
        </div>
      </div>

      {showCreateWedding && (
        <CreateWeddingDialog
          coupleNames={quote?.couple_names ?? contract.title.replace(/^Contract\s*[–-]\s*/i, '')}
          contractId={contract.id}
          customerId={contractCustomerId}
          onClose={() => setShowCreateWedding(false)}
        />
      )}
    </div>
  );
}
