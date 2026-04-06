'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface ContractData {
  id: string;
  title: string;
  status: string;
  pdf_url: string | null;
  signed_pdf_url: string | null;
  signed_at: string | null;
}

interface QuoteData {
  id: string;
  status: string;
  total: number;
  currency: string;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  type: string;
  status: string;
  total: number;
  amount_paid: number;
  pdf_url: string | null;
  issued_at: string | null;
  due_date: string | null;
}

interface PaymentScheduleItem {
  id: string;
  order: number;
  description: string;
  amount_type: string;
  amount_value: number;
  due_date: string | null;
}

interface Props {
  admin: AdminProfile;
  contract: ContractData | null;
  quote: QuoteData | null;
  invoices: InvoiceData[];
  paymentSchedule: PaymentScheduleItem[];
}

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminAccountClient({
  admin,
  contract,
  quote,
  invoices,
  paymentSchedule,
}: Props) {
  const t = useTranslations('admin.account');

  const [name, setName] = useState(admin.name);
  const [phone, setPhone] = useState(admin.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/admin/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });
      if (!res.ok) throw new Error('Error saving');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const pendingInvoices = invoices.filter((inv) =>
    ['ISSUED', 'PARTIAL', 'OVERDUE'].includes(inv.status)
  );

  const hasDocuments = contract !== null || quote !== null || invoices.length > 0;

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">{t('personalData')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{admin.email}</p>
          </div>
          <div>
            <label htmlFor="admin-name" className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
            <input
              id="admin-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="admin-phone" className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
            <input
              id="admin-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('phonePlaceholder')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('saving') : t('saveChanges')}
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">{t('changesSaved')}</span>}
          </div>
        </div>
      </section>

      {/* Documents Section */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">{t('documents')}</h2>

        {!hasDocuments ? (
          <p className="text-sm text-gray-500">{t('noDocuments')}</p>
        ) : (
          <div className="space-y-3">
            {/* Quote */}
            {quote && (
              <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('quote')}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(quote.total, quote.currency)}</p>
                  </div>
                </div>
                <StatusBadge label={t(`quoteStatus.${quote.status}` as `quoteStatus.${string}`)} status={quote.status} type="quote" />
              </div>
            )}

            {/* Contract */}
            {contract && (
              <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t('contract')}</p>
                    <p className="text-xs text-gray-500 truncate">{contract.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <StatusBadge label={t(`contractStatus.${contract.status}` as `contractStatus.${string}`)} status={contract.status} type="contract" />
                  {(contract.signed_pdf_url ?? contract.pdf_url) && (
                    <a href={contract.signed_pdf_url ?? contract.pdf_url ?? '#'} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-rose-600 hover:text-rose-700 underline">
                      {t('pdf')}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Invoices */}
            {invoices.map((inv) => {
              const remaining = inv.total - inv.amount_paid;
              return (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {t(`invoiceType.${inv.type}` as `invoiceType.${string}`)} {inv.invoice_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(inv.total)}
                        {inv.amount_paid > 0 && inv.status !== 'PAID' && <> · {t('pendingAmount')} {formatCurrency(remaining)}</>}
                        {inv.due_date && <> · {t('dueOn')} {formatDate(inv.due_date)}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <StatusBadge label={t(`invoiceStatus.${inv.status}` as `invoiceStatus.${string}`)} status={inv.status} type="invoice" />
                    {inv.pdf_url && (
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-rose-600 hover:text-rose-700 underline">
                        {t('pdf')}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pending Payments Section */}
      {pendingInvoices.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('pendingPayments')}</h2>
          <div className="space-y-3">
            {pendingInvoices.map((inv) => {
              const remaining = inv.total - inv.amount_paid;
              const isOverdue = inv.status === 'OVERDUE';
              const isDueSoon = inv.due_date && !isOverdue &&
                new Date(inv.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              return (
                <div key={inv.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${isOverdue ? 'border-red-200 bg-red-50' : isDueSoon ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {t(`invoiceType.${inv.type}` as `invoiceType.${string}`)} {inv.invoice_number}
                    </p>
                    {inv.due_date && (
                      <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                        {isOverdue ? t('overdueOn') : t('dueOn')} {formatDate(inv.due_date)}
                      </p>
                    )}
                  </div>
                  <p className={`text-sm font-bold ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                    {formatCurrency(remaining)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Payment Schedule Section */}
      {paymentSchedule.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">{t('paymentSchedule')}</h2>
          <p className="text-xs text-gray-500 mb-5">{t('paymentScheduleSubtitle')}</p>
          <div className="space-y-3">
            {paymentSchedule.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.description}</p>
                  {item.due_date && <p className="text-xs text-gray-500 mt-0.5">{formatDate(item.due_date)}</p>}
                </div>
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0 ml-4">
                  {item.amount_type === 'FIXED' ? formatCurrency(item.amount_value) : `${item.amount_value}%`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Shared badge component
function StatusBadge({ label, status, type }: { label: string; status: string; type: 'quote' | 'contract' | 'invoice' }) {
  const colorMap: Record<string, string> = {
    // quote
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-orange-100 text-orange-700',
    // contract
    SHARED: 'bg-blue-100 text-blue-700',
    SIGNING: 'bg-amber-100 text-amber-700',
    SIGNED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    // invoice
    ISSUED: 'bg-blue-100 text-blue-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };
  void type;
  const color = colorMap[status] ?? 'bg-gray-100 text-gray-700';
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>{label}</span>;
}
