'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';

interface LineItem {
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
  id_number: string | null;
  address: string | null;
}

interface ContractOption {
  id: string;
  title: string;
  status: string;
  customer: { name: string } | null;
}

interface InvoiceFormData {
  type: 'PROFORMA' | 'INVOICE';
  customer_id: string | null;
  quote_id: string;
  contract_id: string;
  client_name: string;
  client_email: string;
  client_id_number: string;
  client_address: string;
  description: string;
  currency: string;
  discount: number | '';
  tax_rate: number | '';
  due_date: string;
  issued_at: string;
  line_items: LineItem[];
}

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData & { discount?: number | '' }>;
  initialContracts?: ContractOption[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN'];

function emptyItem(): LineItem {
  return { name: '', description: '', quantity: 1, unit_price: 0, total: 0 };
}

export function InvoiceForm({ initialData, initialContracts, onSave, onCancel }: InvoiceFormProps) {
  const t = useTranslations('planner.quotesFinances');
  const locale = useLocale();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InvoiceFormData>({
    type: initialData?.type ?? 'PROFORMA',
    customer_id: initialData?.customer_id ?? null,
    quote_id: initialData?.quote_id ?? '',
    contract_id: initialData?.contract_id ?? '',
    client_name: initialData?.client_name ?? '',
    client_email: initialData?.client_email ?? '',
    client_id_number: initialData?.client_id_number ?? '',
    client_address: initialData?.client_address ?? '',
    description: initialData?.description ?? '',
    currency: initialData?.currency ?? 'EUR',
    discount: initialData?.discount ?? '',
    tax_rate: initialData?.tax_rate ?? '',
    due_date: initialData?.due_date ?? (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString(); })(),
    issued_at: initialData?.issued_at ?? new Date().toISOString(),
    line_items: initialData?.line_items?.length ? initialData.line_items : [emptyItem()],
  });

  const [contracts, setContracts] = useState<ContractOption[]>(initialContracts ?? []);

  // Load signed contracts for the selector only if not provided by the parent
  useEffect(() => {
    if (initialContracts) return;
    fetch('/api/planner/contracts?status=SIGNED')
      .then((r) => r.json())
      .then((json) => setContracts(json.data ?? []))
      .catch(() => {/* ignore */});
  }, [initialContracts]);

  // Customer autocomplete
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSuggestion | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    setForm((p) => ({ ...p, client_name: value, customer_id: null }));
    setSelectedCustomer(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchCustomers(value), 250);
  }

  function selectCustomer(c: CustomerSuggestion) {
    setSelectedCustomer(c);
    setForm((p) => ({
      ...p,
      customer_id: c.id,
      client_name: c.name,
      client_email: c.email ?? p.client_email,
      client_id_number: c.id_number ?? p.client_id_number,
      client_address: c.address ?? p.client_address,
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

  const subtotal = form.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discountAmt = Number(form.discount) || 0;
  const taxRate = Number(form.tax_rate) || 0;
  const taxAmount = (subtotal - discountAmt) * (taxRate / 100);
  const total = subtotal - discountAmt + taxAmount;

  function fmt(amount: number) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: form.currency }).format(amount);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        type: form.type,
        customer_id: form.customer_id || null,
        quote_id: form.quote_id || null,
        contract_id: form.contract_id || null,
        client_email: form.client_email || null,
        client_id_number: form.client_id_number || null,
        client_address: form.client_address || null,
        discount: form.discount === '' ? null : Number(form.discount),
        tax_rate: form.tax_rate === '' ? null : form.tax_rate,
        subtotal,
        tax_amount: taxAmount,
        total,
        issued_at: form.issued_at || null,
        due_date: new Date(form.due_date).toISOString(),
        description: form.description || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Document type */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">{t('invoiceForm.type')}</h3>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setForm((p) => ({ ...p, type: 'PROFORMA' }))}
            className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
              form.type === 'PROFORMA'
                ? 'border-rose-500 bg-rose-50 text-rose-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {t('invoiceForm.typeProforma')}
          </button>
          <button
            type="button"
            onClick={() => setForm((p) => ({ ...p, type: 'INVOICE' }))}
            className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
              form.type === 'INVOICE'
                ? 'border-rose-500 bg-rose-50 text-rose-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {t('invoiceForm.typeInvoice')}
          </button>
        </div>
        {form.type === 'INVOICE' && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t('invoiceDetail.readOnly')}
          </p>
        )}

        {/* Contract link */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceForm.contract')}</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            value={form.contract_id}
            onChange={(e) => setForm((p) => ({ ...p, contract_id: e.target.value }))}
          >
            <option value="">{t('invoiceForm.noContract')}</option>
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}{c.customer ? ` – ${c.customer.name}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Client */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">{t('invoiceForm.clientDetails')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Customer name autocomplete */}
          <div className="sm:col-span-2" ref={wrapperRef}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceForm.clientName')}</label>
            <div className="relative">
              <input
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                value={form.client_name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                autoComplete="off"
                placeholder={t('invoiceForm.searchCustomers')}
              />
              {selectedCustomer && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span className="text-xs bg-rose-100 text-rose-700 rounded-full px-2 py-0.5 font-medium">{t('invoiceForm.existingCustomer')}</span>
                  <button type="button" onClick={clearCustomer} className="text-gray-400 hover:text-gray-600">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceForm.clientEmail')}</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.client_email}
              onChange={(e) => setForm((p) => ({ ...p, client_email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceForm.idPassport')}</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.client_id_number}
              onChange={(e) => setForm((p) => ({ ...p, client_id_number: e.target.value }))}
              placeholder={t('invoiceForm.idPlaceholder')}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceForm.clientAddress')}</label>
            <textarea
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              value={form.client_address}
              onChange={(e) => setForm((p) => ({ ...p, client_address: e.target.value }))}
              placeholder={t('invoiceForm.addressPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceForm.issueDate')}</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.issued_at ? form.issued_at.slice(0, 10) : ''}
              onChange={(e) => setForm((p) => ({ ...p, issued_at: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceForm.dueDate')} *</label>
            <input
              type="date"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.due_date ? form.due_date.slice(0, 10) : ''}
              onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceForm.descriptionNotes')}</label>
            <textarea
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t('invoiceForm.services')}</h3>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-700">{t('invoiceForm.currency')}</label>
            <select
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.currency}
              onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {form.line_items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 sm:col-span-5">
                <input
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  placeholder={t('invoiceForm.serviceName')}
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number" min="0.01" step="0.01" required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-300"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number" min="0" step="0.01" required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-300"
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                />
              </div>
              <div className="col-span-3 sm:col-span-2 flex items-center justify-end">
                <span className="text-sm font-medium text-gray-900">{fmt(item.total)}</span>
              </div>
              <div className="col-span-1 flex items-center justify-center">
                {form.line_items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, line_items: p.line_items.filter((_, i) => i !== index) }))}
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

        <button
          type="button"
          onClick={() => setForm((p) => ({ ...p, line_items: [...p.line_items, emptyItem()] }))}
          className="mt-3 flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-700 font-medium"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('invoiceForm.addLineItem')}
        </button>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 sm:w-72 ml-auto">
            <div className="text-sm text-gray-500">{t('invoiceForm.subtotal')}</div>
            <div className="text-sm font-medium text-gray-900 text-right">{fmt(subtotal)}</div>
            <div className="text-sm text-gray-500">{t('invoiceForm.discount', { currency: form.currency })}</div>
            <input
              type="number" min="0" step="0.01"
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.discount}
              placeholder="0"
              onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value === '' ? '' : Number(e.target.value) }))}
            />
            <div className="text-sm text-gray-500">{t('invoiceForm.taxRate')}</div>
            <input
              type="number" min="0" max="100" step="0.1"
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.tax_rate}
              placeholder="0"
              onChange={(e) => setForm((p) => ({ ...p, tax_rate: e.target.value === '' ? '' : Number(e.target.value) }))}
            />
            {taxRate > 0 && (
              <>
                <div className="text-sm text-gray-500">{t('invoiceForm.tax')}</div>
                <div className="text-sm text-gray-900 text-right">{fmt(taxAmount)}</div>
              </>
            )}
            <div className="text-base font-bold text-gray-900 border-t border-rose-200 pt-2">{t('invoiceForm.total')}</div>
            <div className="text-base font-bold text-rose-600 text-right border-t border-rose-200 pt-2">{fmt(total)}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          {t('invoiceForm.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 transition-all shadow-sm"
        >
          {saving ? t('invoiceForm.saving') : t('invoiceForm.saveInvoice')}
        </button>
      </div>
    </form>
  );
}
