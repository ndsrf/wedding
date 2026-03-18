'use client';

import { useState } from 'react';

interface LineItem {
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceFormData {
  quote_id: string;
  client_name: string;
  client_email: string;
  description: string;
  currency: string;
  tax_rate: number | '';
  due_date: string;
  issued_at: string;
  line_items: LineItem[];
}

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN'];

function emptyItem(): LineItem {
  return { name: '', description: '', quantity: 1, unit_price: 0, total: 0 };
}

export function InvoiceForm({ initialData, onSave, onCancel }: InvoiceFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InvoiceFormData>({
    quote_id: initialData?.quote_id ?? '',
    client_name: initialData?.client_name ?? '',
    client_email: initialData?.client_email ?? '',
    description: initialData?.description ?? '',
    currency: initialData?.currency ?? 'EUR',
    tax_rate: initialData?.tax_rate ?? '',
    due_date: initialData?.due_date ?? '',
    issued_at: initialData?.issued_at ?? new Date().toISOString(),
    line_items: initialData?.line_items?.length ? initialData.line_items : [emptyItem()],
  });

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
  const taxRate = Number(form.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        quote_id: form.quote_id || null,
        client_email: form.client_email || null,
        tax_rate: form.tax_rate === '' ? null : form.tax_rate,
        subtotal,
        tax_amount: taxAmount,
        total,
        issued_at: form.issued_at || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Client Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Client Name *</label>
            <input
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.client_name}
              onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Client Email</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.client_email}
              onChange={(e) => setForm((p) => ({ ...p, client_email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Issue Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.issued_at ? form.issued_at.slice(0, 10) : ''}
              onChange={(e) => setForm((p) => ({ ...p, issued_at: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.due_date ? form.due_date.slice(0, 10) : ''}
              onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description / Notes</label>
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
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Services</h3>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-700">Currency</label>
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
                  placeholder="Service name"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-300"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-300"
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                />
              </div>
              <div className="col-span-3 sm:col-span-2 flex items-center justify-end">
                <span className="text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('en', { style: 'currency', currency: form.currency }).format(item.total)}
                </span>
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
          Add line item
        </button>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 sm:w-72 ml-auto">
            <div className="text-sm text-gray-500">Subtotal</div>
            <div className="text-sm font-medium text-gray-900 text-right">
              {new Intl.NumberFormat('en', { style: 'currency', currency: form.currency }).format(subtotal)}
            </div>
            <div className="text-sm text-gray-500">Tax rate (%)</div>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-300"
              value={form.tax_rate}
              placeholder="0"
              onChange={(e) => setForm((p) => ({ ...p, tax_rate: e.target.value === '' ? '' : Number(e.target.value) }))}
            />
            {taxRate > 0 && (
              <>
                <div className="text-sm text-gray-500">Tax</div>
                <div className="text-sm text-gray-900 text-right">
                  {new Intl.NumberFormat('en', { style: 'currency', currency: form.currency }).format(taxAmount)}
                </div>
              </>
            )}
            <div className="text-base font-bold text-gray-900 border-t border-rose-200 pt-2">Total</div>
            <div className="text-base font-bold text-rose-600 text-right border-t border-rose-200 pt-2">
              {new Intl.NumberFormat('en', { style: 'currency', currency: form.currency }).format(total)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 transition-all shadow-sm"
        >
          {saving ? 'Saving…' : 'Save Invoice'}
        </button>
      </div>
    </form>
  );
}
