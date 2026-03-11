'use client';

import { useState, useEffect, useRef } from 'react';

interface RagStatus {
  total: number;
  processed: number;
  failed: number;
  inProgress: boolean;
  triggeredAt: string | null;
}

export function RagReindexPanel() {
  const [status, setStatus] = useState<RagStatus | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetch('/api/master/rag/status');
      const json = await res.json();
      if (json.success) {
        const s: RagStatus = json.data;
        setStatus(s);
        if (!s.inProgress) stopPolling();
      }
    } catch {
      // ignore transient fetch errors during polling
    }
  }

  function startPolling() {
    stopPolling();
    pollIntervalRef.current = setInterval(fetchStatus, 3000);
  }

  async function handleReindex() {
    setIsTriggering(true);
    setError(null);
    try {
      const res = await fetch('/api/master/rag/reindex', { method: 'POST' });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? 'Reindex failed');
        return;
      }
      // Start polling for progress
      await fetchStatus();
      startPolling();
    } catch {
      setError('Failed to trigger reindex');
    } finally {
      setIsTriggering(false);
    }
  }

  // Initial status fetch on mount
  useEffect(() => {
    fetchStatus();
    return () => stopPolling();
  }, []);

  // Resume polling if a job is already in progress when component mounts
  useEffect(() => {
    if (status?.inProgress) startPolling();
  }, [status?.inProgress]);

  const pct = status && status.total > 0
    ? Math.round((status.processed / status.total) * 100)
    : 0;

  const statusLabel = !status || status.total === 0
    ? 'Idle'
    : status.inProgress
      ? 'In Progress'
      : 'Complete';

  const statusColor =
    statusLabel === 'In Progress'
      ? 'bg-yellow-100 text-yellow-800'
      : statusLabel === 'Complete'
        ? 'bg-green-100 text-green-800'
        : 'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-8 border border-pink-100 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Documents &amp; AI</h2>
          <p className="text-sm text-gray-500 mt-1">Re-index all Vercel Blob documents into the vector search database.</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {status && status.total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{status.processed} / {status.total} files</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {status.failed > 0 && (
            <p className="text-xs text-red-500 mt-1">{status.failed} file(s) failed</p>
          )}
        </div>
      )}

      <button
        onClick={handleReindex}
        disabled={isTriggering || status?.inProgress}
        className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isTriggering ? 'Starting…' : 'Re-index All Documents'}
      </button>
    </div>
  );
}
