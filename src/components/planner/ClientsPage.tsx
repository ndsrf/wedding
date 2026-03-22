'use client';

import { useState, useEffect, useCallback } from 'react';

type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
type ContractStatus = 'DRAFT' | 'SHARED' | 'SIGNING' | 'SIGNED' | 'CANCELLED';
type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

interface CustomerQuote {
  id: string;
  couple_names: string;
  status: QuoteStatus;
  total: string;
  currency: string;
  created_at: string;
}

interface CustomerContract {
  id: string;
  title: string;
  status: ContractStatus;
  created_at: string;
}

interface CustomerInvoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total: string;
  amount_paid: string;
  currency: string;
  due_date: string | null;
  created_at: string;
}

interface CustomerWedding {
  id: string;
  couple_names: string;
  wedding_date: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  id_number: string | null;
  notes: string | null;
  created_at: string;
  quotes: CustomerQuote[];
  contracts: CustomerContract[];
  invoices: CustomerInvoice[];
  weddings: CustomerWedding[];
}

const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
};

const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SHARED: 'bg-blue-100 text-blue-700',
  SIGNING: 'bg-yellow-100 text-yellow-700',
  SIGNED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function StatusBadge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function PaymentBar({ invoice }: { invoice: CustomerInvoice }) {
  const total = parseFloat(invoice.total);
  const paid = parseFloat(invoice.amount_paid);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const isOverdue = invoice.status === 'OVERDUE';

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isOverdue ? 'bg-red-400' : 'bg-green-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
        {pct}%{isOverdue ? ' overdue' : ''}
      </span>
    </div>
  );
}

interface AddClientModalProps {
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

function AddClientModal({ onClose, onCreated }: AddClientModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/planner/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          id_number: idNumber.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to create client');
      const json = await res.json();
      onCreated({ ...json.data, quotes: [], contracts: [], invoices: [], weddings: [] });
    } catch {
      setError('Failed to create client. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add New Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g. María García"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="client@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="+34 600 000 000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID / Passport Number</label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="DNI, NIE, Passport..."
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {saving ? 'Adding...' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CustomerCardProps {
  customer: Customer;
  onDeleted: (id: string) => void;
}

function CustomerCard({ customer, onDeleted }: CustomerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasLinkedData =
    customer.quotes.length > 0 ||
    customer.contracts.length > 0 ||
    customer.invoices.length > 0 ||
    customer.weddings.length > 0;

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/planner/customers/${customer.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? 'Failed to delete client');
        return;
      }
      onDeleted(customer.id);
    } catch {
      alert('Failed to delete client');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const invoicesWithPayment = customer.invoices.filter(
    (inv) => inv.status !== 'DRAFT' && inv.status !== 'CANCELLED'
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <div className="flex-shrink-0 w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
          <span className="text-teal-700 font-semibold text-sm">{customer.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{customer.name}</h3>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {customer.email && (
              <span className="text-xs text-gray-500 truncate">{customer.email}</span>
            )}
            {customer.phone && (
              <span className="text-xs text-gray-500">{customer.phone}</span>
            )}
            {customer.id_number && (
              <span className="text-xs text-gray-400">ID: {customer.id_number}</span>
            )}
          </div>
        </div>

        {/* Summary badges */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {customer.quotes.length > 0 && (
            <span className="text-xs text-gray-500">{customer.quotes.length} quote{customer.quotes.length !== 1 ? 's' : ''}</span>
          )}
          {customer.contracts.length > 0 && (
            <span className="text-xs text-gray-500">{customer.contracts.length} contract{customer.contracts.length !== 1 ? 's' : ''}</span>
          )}
          {customer.invoices.length > 0 && (
            <span className="text-xs text-gray-500">{customer.invoices.length} invoice{customer.invoices.length !== 1 ? 's' : ''}</span>
          )}
          {customer.weddings.length > 0 && (
            <span className="text-xs text-gray-500">{customer.weddings.length} wedding{customer.weddings.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!hasLinkedData && (
            <>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? '...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
                  title="Delete client"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
          >
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Quotes */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quotes</h4>
            {customer.quotes.length === 0 ? (
              <p className="text-xs text-gray-400">None</p>
            ) : (
              <div className="space-y-1.5">
                {customer.quotes.map((q) => (
                  <a
                    key={q.id}
                    href={`/planner/quotes-finances?tab=quotes&id=${q.id}`}
                    className="flex items-center justify-between gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2 transition-colors"
                  >
                    <span className="text-xs text-gray-700 truncate">{q.couple_names}</span>
                    <StatusBadge label={q.status} colorClass={QUOTE_STATUS_COLORS[q.status]} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Contracts */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contracts</h4>
            {customer.contracts.length === 0 ? (
              <p className="text-xs text-gray-400">None</p>
            ) : (
              <div className="space-y-1.5">
                {customer.contracts.map((c) => (
                  <a
                    key={c.id}
                    href={`/planner/quotes-finances?tab=contracts&id=${c.id}`}
                    className="flex items-center justify-between gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2 transition-colors"
                  >
                    <span className="text-xs text-gray-700 truncate">{c.title}</span>
                    <StatusBadge label={c.status} colorClass={CONTRACT_STATUS_COLORS[c.status]} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Invoices & Payments */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Invoices</h4>
            {customer.invoices.length === 0 ? (
              <p className="text-xs text-gray-400">None</p>
            ) : (
              <div className="space-y-2">
                {customer.invoices.map((inv) => (
                  <a
                    key={inv.id}
                    href={`/planner/quotes-finances?tab=invoices&id=${inv.id}`}
                    className="block hover:bg-gray-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-gray-700 truncate">{inv.invoice_number}</span>
                      <StatusBadge label={inv.status} colorClass={INVOICE_STATUS_COLORS[inv.status]} />
                    </div>
                    {invoicesWithPayment.includes(inv) && <PaymentBar invoice={inv} />}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Weddings */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Weddings</h4>
            {customer.weddings.length === 0 ? (
              <p className="text-xs text-gray-400">None</p>
            ) : (
              <div className="space-y-1.5">
                {customer.weddings.map((w) => (
                  <a
                    key={w.id}
                    href={`/planner/weddings/${w.id}`}
                    className="flex items-center justify-between gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 -mx-2 transition-colors"
                  >
                    <span className="text-xs text-gray-700 truncate">{w.couple_names}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(w.wedding_date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quoteFilter, setQuoteFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ full: 'true' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (quoteFilter) params.set('quote_status', quoteFilter);
      if (contractFilter) params.set('contract_status', contractFilter);
      if (invoiceFilter) params.set('invoice_status', invoiceFilter);

      const res = await fetch(`/api/planner/customers?${params}`);
      const json = await res.json();
      setCustomers(json.data ?? []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, quoteFilter, contractFilter, invoiceFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  function handleCreated(customer: Customer) {
    setShowAddModal(false);
    setCustomers((prev) => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)));
  }

  function handleDeleted(id: string) {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Filters + Add */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients by name..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Quote status filter */}
          <select
            value={quoteFilter}
            onChange={(e) => setQuoteFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
          >
            <option value="">All quote statuses</option>
            <option value="DRAFT">Quote: Draft</option>
            <option value="SENT">Quote: Sent</option>
            <option value="ACCEPTED">Quote: Accepted</option>
            <option value="REJECTED">Quote: Rejected</option>
            <option value="EXPIRED">Quote: Expired</option>
          </select>

          {/* Contract status filter */}
          <select
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
          >
            <option value="">All contract statuses</option>
            <option value="DRAFT">Contract: Draft</option>
            <option value="SHARED">Contract: Shared</option>
            <option value="SIGNING">Contract: Signing</option>
            <option value="SIGNED">Contract: Signed</option>
            <option value="CANCELLED">Contract: Cancelled</option>
          </select>

          {/* Invoice status filter */}
          <select
            value={invoiceFilter}
            onChange={(e) => setInvoiceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
          >
            <option value="">All invoice statuses</option>
            <option value="DRAFT">Invoice: Draft</option>
            <option value="ISSUED">Invoice: Issued</option>
            <option value="PARTIAL">Invoice: Partial</option>
            <option value="PAID">Invoice: Paid</option>
            <option value="OVERDUE">Invoice: Overdue</option>
            <option value="CANCELLED">Invoice: Cancelled</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </button>
        </div>
      </div>

      {/* Customer list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="h-6 w-6 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">
            {debouncedSearch || quoteFilter || contractFilter || invoiceFilter
              ? 'No clients match your filters'
              : 'No clients yet'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {debouncedSearch || quoteFilter || contractFilter || invoiceFilter
              ? 'Try adjusting your search or filters.'
              : 'Add your first client to get started.'}
          </p>
          {!debouncedSearch && !quoteFilter && !contractFilter && !invoiceFilter && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Client
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 px-1">{customers.length} client{customers.length !== 1 ? 's' : ''}</p>
          {customers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddClientModal onClose={() => setShowAddModal(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
