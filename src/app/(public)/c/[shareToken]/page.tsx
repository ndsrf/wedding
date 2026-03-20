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

export default function ClientContractPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const [shareToken, setShareToken] = useState('');
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  // Shared Y.Doc between editor (for Liveblocks sync) and comments sidebar
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
  }, [shareToken]);

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

  // ── Name gate ──────────────────────────────────────────────────────────────
  if (!nameSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 font-playfair">{contract.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Shared by {contract.planner.name}</p>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Please enter your name to continue reviewing this contract.
          </p>
          <input
            type="text"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            placeholder="Your name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && clientName.trim()) setNameSubmitted(true); }}
            autoFocus
          />
          <button
            onClick={() => { if (clientName.trim()) setNameSubmitted(true); }}
            className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-sm font-semibold hover:from-rose-600 hover:to-pink-700 transition-all"
          >
            View Contract
          </button>
        </div>
      </div>
    );
  }

  // ── Contract review ────────────────────────────────────────────────────────
  const clientColor = '#7c3aed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => window.close()}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 font-playfair truncate">{contract.title}</h1>
              <p className="text-xs text-gray-500 mt-0.5">Shared by {contract.planner.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {contract.status === 'SIGNED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Signed
              </span>
            ) : contract.status === 'SIGNING' && contract.signing_url ? (
              <a
                href={contract.signing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-full text-xs font-semibold hover:bg-rose-700 transition-colors"
              >
                Sign Now
              </a>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold">
                Review Mode
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hint banner */}
      {selectedText && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-yellow-800">
            <svg className="h-4 w-4 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span>
              <strong>Text selected</strong> — add a comment in the sidebar to flag this section for your planner.
            </span>
          </div>
        </div>
      )}

      {/* Editor + comments sidebar */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6 items-start">
        {/* Read-only contract */}
        <div className="flex-1 min-w-0">
          <ContractEditor
            contractId={contract.id}
            initialContent={contract.content}
            readOnly
            externalYdocRef={ydocRef}
            authExtra={{
              share_token: shareToken,
              client_name: clientName,
            }}
            currentUser={{
              id: `client-${shareToken.slice(0, 8)}`,
              name: clientName,
              color: clientColor,
            }}
            onSelectionChange={setSelectedText}
          />
          <p className="text-center text-xs text-gray-400 mt-4">
            Select any text and add a comment in the sidebar to flag it for your wedding planner.
          </p>
        </div>

        {/* Comments sidebar */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
            <ContractCommentsSidebar
              ydocRef={ydocRef}
              authorName={clientName}
              authorColor={clientColor}
              isPlanner={false}
              pendingSelectedText={selectedText}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
