'use client';

import { useState, useEffect } from 'react';
import { QuoteForm } from './QuoteForm';

interface Quote {
  id: string;
  couple_names: string;
  event_date: string | null;
  location: string | null;
  client_email: string | null;
  status: string;
  currency: string;
  total: string | number;
  expires_at: string | null;
  created_at: string;
  contract: { id: string; status: string } | null;
  invoices: { id: string; status: string }[];
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
};

export function QuotesList() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  async function fetchQuotes() {
    const res = await fetch('/api/planner/quotes');
    if (res.ok) {
      const json = await res.json();
      setQuotes(json.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchQuotes(); }, []);

  async function handleSave(data: Record<string, unknown>) {
    if (editingId) {
      await fetch(`/api/planner/quotes/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
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

  async function handleGeneratePdf(id: string) {
    setGenerating(id);
    const res = await fetch(`/api/planner/quotes/${id}/generate-pdf`, { method: 'POST' });
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

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin w-6 h-6 border-4 border-rose-500 border-t-transparent rounded-full" />
    </div>
  );

  const editingQuote = editingId ? quotes.find((q) => q.id === editingId) : null;

  if (showForm) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <h3 className="text-base font-semibold text-gray-900">{editingId ? 'Edit Quote' : 'New Quote'}</h3>
        </div>
        <QuoteForm
          initialData={editingQuote ? {
            couple_names: editingQuote.couple_names,
            event_date: editingQuote.event_date ?? '',
            location: editingQuote.location ?? '',
            client_email: editingQuote.client_email ?? '',
          } : undefined}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingId(null); }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Quotes</h3>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Quote
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">No quotes yet</h3>
          <p className="text-xs text-gray-500 mt-1">Create your first quote to send to a potential client.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all"
          >
            Create Quote
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => (
            <div key={quote.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-gray-900">{quote.couple_names}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[quote.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {quote.status}
                    </span>
                    {quote.contract && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Contract</span>
                    )}
                    {quote.invoices.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Invoiced</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    {quote.event_date && <span>{new Date(quote.event_date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    {quote.location && <span>📍 {quote.location}</span>}
                    {quote.client_email && <span>✉ {quote.client_email}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    {new Intl.NumberFormat('en', { style: 'currency', currency: quote.currency }).format(Number(quote.total))}
                  </span>
                  {quote.expires_at && new Date(quote.expires_at) < new Date() && quote.status !== 'EXPIRED' && (
                    <span className="text-xs text-orange-500">Expired</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                <button
                  onClick={() => handleGeneratePdf(quote.id)}
                  disabled={generating === quote.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {generating === quote.id ? (
                    <span className="animate-spin w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full" />
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  PDF
                </button>
                <button
                  onClick={() => { setEditingId(quote.id); setShowForm(true); }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Edit
                </button>
                {quote.status === 'DRAFT' && (
                  <button
                    onClick={() => handleStatusChange(quote.id, 'SENT')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Mark Sent
                  </button>
                )}
                {quote.status === 'SENT' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(quote.id, 'ACCEPTED')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleStatusChange(quote.id, 'REJECTED')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(quote.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
