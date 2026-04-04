'use client';

import { useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import type { Invoice } from './InvoicesList';

interface PaymentFormData {
  amount: number;
  currency: string;
  payment_date: string;
  method: string;
  reference: string;
  notes: string;
}

const PAYMENT_METHODS = ['BANK_TRANSFER', 'CASH', 'PAYPAL', 'BIZUM', 'REVOLUT', 'OTHER'];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

interface InvoiceDetailProps {
  invoice: Invoice;
  onBack: () => void;
  onRefresh: () => void;
}

export function InvoiceDetail({ invoice, onBack, onRefresh }: InvoiceDetailProps) {
  const t = useTranslations('planner.quotesFinances');
  const format = useFormatter();

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    amount: Number(invoice.total) - Number(invoice.amount_paid),
    currency: invoice.currency,
    payment_date: new Date().toISOString().slice(0, 10),
    method: 'BANK_TRANSFER',
    reference: '',
    notes: '',
  });

  const total = Number(invoice.total);
  const paid = Number(invoice.amount_paid);
  const balanceDue = total - paid;
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  function fmt(amount: number | string) {
    return format.number(Number(amount), { style: 'currency', currency: invoice.currency });
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setSavingPayment(true);
    try {
      const res = await fetch(`/api/planner/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          payment_date: new Date(paymentForm.payment_date).toISOString(),
          reference: paymentForm.reference || null,
          notes: paymentForm.notes || null,
        }),
      });
      if (res.ok) {
        setShowPaymentForm(false);
        onRefresh();
      }
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm(t('invoiceDetail.removePaymentConfirm'))) return;
    await fetch(`/api/planner/invoices/${invoice.id}/payments/${paymentId}`, { method: 'DELETE' });
    onRefresh();
  }

  async function handleMarkIssued() {
    setUpdatingStatus(true);
    await fetch(`/api/planner/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ISSUED', issued_at: new Date().toISOString() }),
    });
    setUpdatingStatus(false);
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          {t('invoiceDetail.back')}
        </button>
        <h3 className="text-base font-semibold text-gray-900">{invoice.invoice_number}</h3>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[invoice.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {t(`invoices.status.${invoice.status}` as Parameters<typeof t>[0])}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invoice details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">{t('invoiceDetail.client')}</p>
                <p className="text-sm font-semibold text-gray-900">{invoice.customer?.name ?? ''}</p>
                {invoice.customer?.email && <p className="text-xs text-gray-500">{invoice.customer.email}</p>}
                {invoice.customer?.phone && <p className="text-xs text-gray-500">{invoice.customer.phone}</p>}
                {invoice.customer?.address && <p className="text-xs text-gray-500">{invoice.customer.address}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">{t('invoiceDetail.invoiceHash')}</p>
                <p className="text-sm font-mono font-semibold text-gray-900">{invoice.invoice_number}</p>
                {invoice.due_date && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('invoiceDetail.due', { date: format.dateTime(new Date(invoice.due_date), { day: 'numeric', month: 'short', year: 'numeric' }) })}
                  </p>
                )}
              </div>
            </div>

            {/* Line items */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 pb-2">{t('invoiceDetail.colService')}</th>
                  <th className="text-right text-xs font-medium text-gray-500 pb-2 w-16">{t('invoiceDetail.colQty')}</th>
                  <th className="text-right text-xs font-medium text-gray-500 pb-2 w-24">{t('invoiceDetail.colUnit')}</th>
                  <th className="text-right text-xs font-medium text-gray-500 pb-2 w-24">{t('invoiceDetail.colTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="py-2">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                    </td>
                    <td className="py-2 text-right text-gray-600">{Number(item.quantity)}</td>
                    <td className="py-2 text-right text-gray-600">{fmt(item.unit_price)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
              <div className="flex justify-end gap-8 text-sm">
                <span className="text-gray-500">{t('invoiceDetail.subtotal')}</span>
                <span className="font-medium w-24 text-right">{fmt(invoice.subtotal)}</span>
              </div>
              {invoice.discount !== null && Number(invoice.discount) > 0 && (
                <div className="flex justify-end gap-8 text-sm">
                  <span className="text-gray-500">{t('invoiceDetail.discount')}</span>
                  <span className="font-medium w-24 text-right text-green-600">- {fmt(invoice.discount)}</span>
                </div>
              )}
              {invoice.tax_rate !== null && Number(invoice.tax_rate) > 0 && (
                <div className="flex justify-end gap-8 text-sm">
                  <span className="text-gray-500">{t('invoiceDetail.tax', { rate: String(Number(invoice.tax_rate)) })}</span>
                  <span className="font-medium w-24 text-right">{fmt(invoice.tax_amount ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-end gap-8 text-base font-bold pt-1 border-t border-gray-100">
                <span>{t('invoiceDetail.total')}</span>
                <span className="text-rose-600 w-24 text-right">{fmt(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Payment tracker */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">{t('invoiceDetail.paymentStatus')}</h4>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-gray-900">{paidPct}%</p>
              <p className="text-xs text-gray-500">{t('invoiceDetail.paidLabel')}</p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mb-4">
              <span>{t('invoiceDetail.paidAmount', { amount: fmt(paid) })}</span>
              <span>{t('invoiceDetail.dueAmount', { amount: fmt(balanceDue) })}</span>
            </div>

            {invoice.status === 'DRAFT' && (
              <button
                onClick={handleMarkIssued}
                disabled={updatingStatus}
                className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {updatingStatus ? t('invoiceDetail.updating') : t('invoiceDetail.markAsIssued')}
              </button>
            )}

            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <button
                onClick={() => setShowPaymentForm(true)}
                className="w-full mt-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 rounded-xl transition-all"
              >
                {t('invoiceDetail.recordPayment')}
              </button>
            )}

            {invoice.status === 'PAID' && (
              <div className="text-center py-2">
                <div className="inline-flex items-center gap-1.5 text-green-600 font-semibold text-sm">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('invoiceDetail.fullyPaid')}
                </div>
              </div>
            )}
          </div>

          {/* Record payment form */}
          {showPaymentForm && (
            <div className="bg-white rounded-xl border border-rose-100 shadow-sm p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">{t('invoiceDetail.recordPayment')}</h4>
              <form onSubmit={handleRecordPayment} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceDetail.amount')}</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, amount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceDetail.date')}</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceDetail.method')}</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, method: e.target.value }))}
                  >
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('invoiceDetail.reference')}</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    placeholder={t('invoiceDetail.referencePlaceholder')}
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">
                    {t('invoiceDetail.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={savingPayment}
                    className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
                  >
                    {savingPayment ? t('invoiceDetail.saving') : t('invoiceDetail.save')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Payment history */}
          {invoice.payments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('invoiceDetail.paymentHistory')}</h4>
              <div className="space-y-2">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-gray-900">{fmt(p.amount)}</p>
                      <p className="text-xs text-gray-400">
                        {format.dateTime(new Date(p.payment_date), { day: 'numeric', month: 'short' })} · {p.method.replace('_', ' ')}
                        {p.reference && ` · ${p.reference}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(p.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
