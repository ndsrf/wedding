'use client';

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { ContractEditor } from '@/components/planner/quotes-finances/contracts/ContractEditor';
import { ContractCommentsSidebar } from '@/components/planner/quotes-finances/contracts/ContractCommentsSidebar';

interface ContractData {
  id: string;
  title: string;
  content: object;
  status: string;
  planner: { name: string };
  signed_at: string | null;
  signing_url: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SHARED: 'bg-blue-100 text-blue-700',
  SIGNING: 'bg-amber-100 text-amber-700',
  SIGNED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SHARED: 'Shared with client',
  SIGNING: 'Awaiting Signature',
  SIGNED: 'Signed',
  CANCELLED: 'Cancelled',
};

export default function PlannerContractPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const [shareToken, setShareToken] = useState('');
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plannerName, setPlannerName] = useState('Planner');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Shared Y.Doc: editor + comments sidebar share the same Liveblocks connection
  const ydocRef = useRef<Y.Doc>(new Y.Doc());

  useEffect(() => {
    params.then((p) => setShareToken(p.shareToken));
  }, [params]);

  useEffect(() => {
    if (!shareToken) return;
    fetch(`/api/planner/contracts/shared/${shareToken}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error);
        else setContract(res.data);
      })
      .catch(() => setError('Failed to load contract'))
      .finally(() => setLoading(false));

    fetch('/api/planner/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => { if (res?.name) setPlannerName(res.name); })
      .catch(() => {});
  }, [shareToken]);

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
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Contract not found</h1>
          <p className="text-gray-500">{error ?? 'This link may have expired or been revoked.'}</p>
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
                  {STATUS_LABELS[contract.status] ?? contract.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 text-xs">
            {saving && <span className="text-gray-400">Saving…</span>}
            {saved && <span className="text-green-600 font-medium">Saved ✓</span>}
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
            currentUser={{ id: 'planner', name: plannerName, color: '#e11d48' }}
          />
        </div>

        <div className="w-full lg:w-72 lg:flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden lg:flex lg:flex-col">
            <ContractCommentsSidebar
              ydocRef={ydocRef}
              authorName={plannerName}
              authorColor="#e11d48"
              isPlanner
            />
          </div>
        </div>
      </div>
    </div>
  );
}
