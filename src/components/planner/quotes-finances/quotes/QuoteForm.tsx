'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface LineItem {
  id?: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface CustomerSuggestion {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface QuoteFormData {
  customer_id: string | null;
  couple_names: string;
  event_date: string;
  location: string;
  client_email: string;
  client_phone: string;
  notes: string;
  currency: string;
  discount: number | '';
  tax_rate: number | '';
  expires_at: string;
  line_items: LineItem[];
}

interface QuoteFormProps {
  initialData?: Partial<QuoteFormData> & { id?: string };
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  readOnly?: boolean;
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF'];

function emptyItem(): LineItem {
  return { name: '', description: '', quantity: 1, unit_price: 0, total: 0 };
}

export function QuoteForm({ initialData, onSave, onCancel, readOnly = false }: QuoteFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<QuoteFormData>({
    customer_id: initialData?.customer_id ?? null,
    couple_names: initialData?.couple_names ?? '',
    event_date: initialData?.event_date ?? '',
    location: initialData?.location ?? '',
    client_email: initialData?.client_email ?? '',
    client_phone: initialData?.client_phone ?? '',
    notes: initialData?.notes ?? '',
    currency: initialData?.currency ?? 'EUR',
    discount: initialData?.discount ?? '',
    tax_rate: initialData?.tax_rate ?? '',
    expires_at: initialData?.expires_at ?? '',
    line_items: initialData?.line_items?.length ? initialData.line_items : [emptyItem()],
  });

  // Customer autocomplete state
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSuggestion | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchCustomers = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const res = await fetch(`/api/planner/customers?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const json = await res.json();
      setSuggestions(json.data ?? []);
      setShowSuggestions(true);
    } catch { /* ignore */ }
  }, []);

  function handleNameChange(value: string) {
    setForm((p) => ({ ...p, couple_names: value, customer_id: null }));
    setSelectedCustomer(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchCustomers(value), 250);
  }

  function selectCustomer(c: CustomerSuggestion) {
    setSelectedCustomer(c);
    setForm((p) => ({
      ...p,
      customer_id: c.id,
      couple_names: c.name,
      client_email: c.email ?? p.client_email,
      client_phone: c.phone ?? p.client_phone,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setForm((p) => ({ ...p, customer_id: null }));
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setForm((prev) => {
      const items = prev.line_items.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = Number(updated.quantity) * Number(updated.unit_price);
        }
        return updated;
      });
      return { ...prev, line_items: items };
    });
  }

  function addItem() {
    setForm((prev) => ({ ...prev, line_items: [...prev.line_items, emptyItem()] }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index),
    }));
  }

  const subtotal = form.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discountAmt = Number(form.discount) || 0;
  const taxRate = Number(form.tax_rate) || 0;
  const taxAmount = (subtotal - discountAmt) * (taxRate / 100);
  const total = subtotal - discountAmt + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        subtotal,
        total,
        discount: form.discount === '' ? null : Number(form.discount),
        tax_rate: form.tax_rate === '' ? null : Number(form.tax_rate),
        event_date: form.event_date || null,
        expires_at: form.expires_at || null,
        client_email: form.client_email || null,
        client_phone: form.client_phone || null,
        location: form.location || null,
        notes: form.notes || null,
      });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 ${readOnly ? 'bg-gray-50 cursor-default' : ''}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Client Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Customer name with autocomplete */}
          <div className="sm:col-span-2" ref={wrapperRef}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Couple / Client Name *</label>
            <div className="relative">
              <input
                required
                readOnly={readOnly}
                className={inputClass}
                value={form.couple_names}
                onChange={(e) => !readOnly && handleNameChange(e.target.value)}
                onFocus={() => { if (!readOnly && suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="Sarah & James"
                autoComplete="off"
              />
              {selectedCustomer && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span className="text-xs bg-rose-100 text-rose-700 rounded-full px-2 py-0.5 font-medium">Existing customer</span>
                  {!readOnly && (
                    <button type="button" onClick={clearCustomer} className="text-gray-400 hover:text-gray-600">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-rose-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-900">{c.name}</span>
                        {(c.email || c.phone) && (
                          <span className="text-xs text-gray-500 ml-2">
                            {[c.email, c.phone].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                  <li className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 italic">
                    Not listed? Keep typing to create a new customer.
                  </li>
                </ul>
              )}
            </div>
            {!selectedCustomer && form.couple_names.length >= 2 && suggestions.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No existing customers found — a new one will be created on save.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Event Date</label>
            <input
              type="date"
              readOnly={readOnly}
              className={inputClass}
              value={form.event_date ? form.event_date.slice(0, 10) : ''}
              onChange={(e) => !readOnly && setForm((p) => ({ ...p, event_date: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <input
              readOnly={readOnly}
              className={inputClass}
              value={form.location}
              onChange={(e) => !readOnly && setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="Barcelona, Spain"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Client Email</label>
            <input
              type="email"
              readOnly={readOnly}
              className={inputClass}
              value={form.client_email}
              onChange={(e) => !readOnly && setForm((p) => ({ ...p, client_email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Client Phone</label>
            <input
              readOnly={readOnly}
              className={inputClass}
              value={form.client_phone}
              onChange={(e) => !readOnly && setForm((p) => ({ ...p, client_phone: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Services</h3>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-700">Currency</label>
            <select
              disabled={readOnly}
              className={`border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 ${readOnly ? 'bg-gray-50 cursor-default' : ''}`}
              value={form.currency}
              onChange={(e) => !readOnly && setForm((p) => ({ ...p, currency: e.target.value }))}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {readOnly && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">This quote is read-only. Only draft quotes can be edited.</p>
        )}
        <div className="hidden sm:grid sm:grid-cols-12 gap-2 mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <div className="sm:col-span-5">Description</div>
          <div className="sm:col-span-2 text-right">Qty</div>
          <div className="sm:col-span-2 text-right">Unit Price</div>
          <div className="sm:col-span-2 text-right">Total</div>
          <div className="sm:col-span-1" />
        </div>

        <div className="space-y-2">
          {form.line_items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 sm:col-span-5">
                <input
                  required
                  readOnly={readOnly}
                  className={inputClass}
                  placeholder="Service name"
                  value={item.name}
                  onChange={(e) => !readOnly && updateItem(index, 'name', e.target.value)}
                />
                <input
                  readOnly={readOnly}
                  className={`w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs mt-1 focus:outline-none focus:ring-2 focus:ring-rose-300 text-gray-500 ${readOnly ? 'bg-gray-50 cursor-default' : ''}`}
                  placeholder="Optional description"
                  value={item.description}
                  onChange={(e) => !readOnly && updateItem(index, 'description', e.target.value)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number" min="0.01" step="0.01" required
                  readOnly={readOnly}
                  className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-300 ${readOnly ? 'bg-gray-50 cursor-default' : ''}`}
                  value={item.quantity}
                  onChange={(e) => !readOnly && updateItem(index, 'quantity', Number(e.target.value))}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number" min="0" step="0.01" required
                  readOnly={readOnly}
                  className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-300 ${readOnly ? 'bg-gray-50 cursor-default' : ''}`}
                  value={item.unit_price}
                  onChange={(e) => !readOnly && updateItem(index, 'unit_price', Number(e.target.value))}
                />
              </div>
              <div className="col-span-3 sm:col-span-2 flex items-center justify-end">
                <span className="text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('en', { style: 'currency', currency: form.currency }).format(item.total)}
                </span>
              </div>
              <div className="col-span-1 flex items-center justify-center">
                {!readOnly && form.line_items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={addItem}
            className="mt-3 flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-700 font-medium"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add line item
          </button>
        )}

        {/* Totals */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 sm:w-72 ml-auto">
            <div className="text-sm text-gray-500">Subtotal</div>
            <div className="text-sm font-medium text-gray-900 text-right">
              {new Intl.NumberFormat('en', { style: 'currency', currency: form.currency }).format(subtotal)}
            </div>
            <div className="text-sm text-gray-500">Discount ({form.currency})</div>
            <div>
              <input
                type="number" min="0" step="0.01"
                readOnly={readOnly}
                className={`w-full border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-300 ${readOnly ? 'bg-gray-50 cursor-default' : ''}`}
                value={form.discount}
                placeholder="0"
                onChange={(e) => !readOnly && setForm((p) => ({ ...p, discount: e.target.value === '' ? '' : Number(e.target.value) }))}
              />
            </div>
            <div className="text-sm text-gray-500">Tax rate (%)</div>
            <div>
              <input
                type="number" min="0" max="100" step="0.1"
                readOnly={readOnly}
                className={`w-full border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-300 ${readOnly ? 'bg-gray-50 cursor-default' : ''}`}
                value={form.tax_rate}
                placeholder="0"
                onChange={(e) => !readOnly && setForm((p) => ({ ...p, tax_rate: e.target.value === '' ? '' : Number(e.target.value) }))}
              />
            </div>
            <div className="text-base font-bold text-gray-900 border-t border-rose-200 pt-2">Total</div>
            <div className="text-base font-bold text-rose-600 text-right border-t border-rose-200 pt-2">
              {new Intl.NumberFormat('en', { style: 'currency', currency: form.currency }).format(total)}
            </div>
          </div>
        </div>
      </div>

      {/* Additional */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Additional Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Valid Until</label>
            <input
              type="date"
              readOnly={readOnly}
              className={inputClass}
              value={form.expires_at ? form.expires_at.slice(0, 10) : ''}
              onChange={(e) => !readOnly && setForm((p) => ({ ...p, expires_at: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              readOnly={readOnly}
              className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none ${readOnly ? 'bg-gray-50 cursor-default' : ''}`}
              value={form.notes}
              onChange={(e) => !readOnly && setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Additional notes or terms..."
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          {readOnly ? 'Close' : 'Cancel'}
        </button>
        {!readOnly && (
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {saving ? 'Saving…' : 'Save Quote'}
          </button>
        )}
      </div>
    </form>
  );
}
