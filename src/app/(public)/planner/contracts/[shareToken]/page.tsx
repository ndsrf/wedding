'use client';

import { useEffect, useState } from 'react';
import { ContractEditor } from '@/components/planner/quotes-finances/contracts/ContractEditor';

interface ContractData {
  id: string;
  title: string;
  content: object;
  status: string;
  planner: { name: string };
  signed_at: string | null;
  signing_url: string | null;
}

export default function SharedContractPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [shareToken, setShareToken] = useState('');

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
          <p className="text-sm text-gray-600 mb-4">Please enter your name to continue reviewing this contract.</p>
          <input
            type="text"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            placeholder="Your name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-playfair">{contract.title}</h1>
              <p className="text-sm text-gray-500 mt-1">Shared by {contract.planner.name}</p>
            </div>
            <div>
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
                <span className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                  Review Mode
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Collaborative Editor */}
        <ContractEditor
          contractId={contract.id}
          initialContent={contract.content}
          readOnly={contract.status === 'SIGNED'}
          currentUser={{
            id: `client-${shareToken.slice(0, 8)}`,
            name: clientName,
            color: '#7c3aed',
          }}
        />

        <p className="text-center text-xs text-gray-400 mt-4">
          Any changes you make are visible in real-time to your wedding planner.
        </p>
      </div>
    </div>
  );
}
