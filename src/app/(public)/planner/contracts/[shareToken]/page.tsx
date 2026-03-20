'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
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

export default function PlannerContractPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const { data: session } = useSession();
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const plannerName = session?.user?.name ?? 'Planner';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-playfair">{contract.title}</h1>
              <p className="text-sm text-gray-500 mt-1">Editing as {plannerName}</p>
            </div>
            <div className="flex items-center gap-2">
              {contract.status === 'SIGNED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Signed
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full text-xs font-semibold">
                  Planner Edit Mode
                </span>
              )}
              <button
                onClick={() => window.close()}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Editor */}
        <ContractEditor
          contractId={contract.id}
          initialContent={contract.content}
          readOnly={contract.status === 'SIGNED'}
          currentUser={{
            id: `planner-${shareToken.slice(0, 8)}`,
            name: plannerName,
            color: '#e11d48',
          }}
        />

        <p className="text-center text-xs text-gray-400 mt-4">
          Changes are saved automatically and visible to clients in real-time.
        </p>
      </div>
    </div>
  );
}
