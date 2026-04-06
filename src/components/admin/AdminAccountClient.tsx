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

export interface InvoiceData {
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

interface PlannerPayment {
  bank_account: string | null;
  accepts_bizum: boolean;
  accepts_revolut: boolean;
  phone: string | null;
}

interface Props {
  admin: AdminProfile;
  contract: ContractData | null;
  quote: QuoteData | null;
  invoices: InvoiceData[];
  paymentSchedule: PaymentScheduleItem[];
  plannerPayment: PlannerPayment;
}

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
}

function formatDate(iso: string | null, fallback: string) {
  if (!iso) return fallback;
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ label, status }: { label: string; status: string }) {
  const colorMap: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-orange-100 text-orange-700',
    SHARED: 'bg-blue-100 text-blue-700',
    SIGNING: 'bg-amber-100 text-amber-700',
    SIGNED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    ISSUED: 'bg-blue-100 text-blue-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorMap[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
}

export default function AdminAccountClient({
  admin,
  contract,
  quote,
  invoices,
  paymentSchedule,
  plannerPayment,
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
  const paidInvoices = invoices.filter((inv) => inv.amount_paid > 0);
  const hasDocuments = contract !== null || quote !== null || invoices.length > 0;

  const hasPaymentMethods =
    plannerPayment.bank_account ||
    plannerPayment.accepts_bizum ||
    plannerPayment.accepts_revolut;

  return (
    <div className="space-y-8">
      {/* ── Profile ─────────────────────────────────────────────────────────── */}
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

      {/* ── Documents ───────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">{t('documents')}</h2>
        {!hasDocuments ? (
          <p className="text-sm text-gray-500">{t('noDocuments')}</p>
        ) : (
          <div className="space-y-3">
            {quote && (
              <DocumentRow
                icon={<QuoteIcon />}
                iconBg="bg-amber-50"
                title={t('quote')}
                subtitle={formatCurrency(quote.total, quote.currency)}
                badge={<StatusBadge label={t(`quoteStatus.${quote.status}` as never)} status={quote.status} />}
              />
            )}
            {contract && (
              <DocumentRow
                icon={<ContractIcon />}
                iconBg="bg-indigo-50"
                title={t('contract')}
                subtitle={contract.title}
                badge={<StatusBadge label={t(`contractStatus.${contract.status}` as never)} status={contract.status} />}
                pdfUrl={contract.signed_pdf_url ?? contract.pdf_url}
                pdfLabel={t('pdf')}
              />
            )}
            {invoices.map((inv) => {
              const remaining = inv.total - inv.amount_paid;
              return (
                <DocumentRow
                  key={inv.id}
                  icon={<InvoiceIcon />}
                  iconBg="bg-rose-50"
                  title={`${t(`invoiceType.${inv.type}` as never)} ${inv.invoice_number}`}
                  subtitle={[
                    formatCurrency(inv.total),
                    inv.amount_paid > 0 && inv.status !== 'PAID'
                      ? `${t('pendingAmount')} ${formatCurrency(remaining)}`
                      : null,
                    inv.issued_at ? `${t('issuedOn')} ${formatDate(inv.issued_at, '')}` : null,
                    inv.due_date ? `${t('dueOn')} ${formatDate(inv.due_date, '')}` : null,
                  ].filter(Boolean).join(' · ')}
                  badge={<StatusBadge label={t(`invoiceStatus.${inv.status}` as never)} status={inv.status} />}
                  pdfUrl={inv.pdf_url}
                  pdfLabel={t('pdf')}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ── Payments made ───────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">{t('paymentsMade')}</h2>
        {paidInvoices.length === 0 ? (
          <p className="text-sm text-gray-500">{t('noPaymentsMade')}</p>
        ) : (
          <div className="space-y-3">
            {paidInvoices.map((inv) => {
              const remaining = inv.total - inv.amount_paid;
              return (
                <div key={inv.id} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {t(`invoiceType.${inv.type}` as never)} {inv.invoice_number}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {inv.issued_at && (
                          <span className="text-xs text-gray-500">{t('issuedOn')} {formatDate(inv.issued_at, '')}</span>
                        )}
                        {inv.due_date && (
                          <span className="text-xs text-gray-500">{t('dueOn')} {formatDate(inv.due_date, t('noPendingDue'))}</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge label={t(`invoiceStatus.${inv.status}` as never)} status={inv.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="text-center rounded-lg bg-white border border-gray-100 px-3 py-2">
                      <p className="text-xs text-gray-500 mb-0.5">Total</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total)}</p>
                    </div>
                    <div className="text-center rounded-lg bg-green-50 border border-green-100 px-3 py-2">
                      <p className="text-xs text-green-600 mb-0.5">{t('paid')}</p>
                      <p className="text-sm font-semibold text-green-700">{formatCurrency(inv.amount_paid)}</p>
                    </div>
                    <div className={`text-center rounded-lg border px-3 py-2 ${remaining > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                      <p className={`text-xs mb-0.5 ${remaining > 0 ? 'text-amber-600' : 'text-gray-500'}`}>{t('remaining')}</p>
                      <p className={`text-sm font-semibold ${remaining > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{formatCurrency(remaining)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Pending payments ────────────────────────────────────────────────── */}
      {pendingInvoices.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('pendingPayments')}</h2>
          <div className="space-y-3">
            {pendingInvoices.map((inv) => {
              const remaining = inv.total - inv.amount_paid;
              const isOverdue = inv.status === 'OVERDUE';
              const isDueSoon =
                inv.due_date && !isOverdue &&
                new Date(inv.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              return (
                <div
                  key={inv.id}
                  className={`flex items-start justify-between rounded-lg border px-4 py-3 gap-3 ${
                    isOverdue ? 'border-red-200 bg-red-50' : isDueSoon ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {t(`invoiceType.${inv.type}` as never)} {inv.invoice_number}
                    </p>
                    {inv.due_date && (
                      <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {isOverdue ? t('overdueOn') : t('dueOn')} {formatDate(inv.due_date, t('noPendingDue'))}
                      </p>
                    )}
                  </div>
                  <p className={`text-sm font-bold flex-shrink-0 ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                    {formatCurrency(remaining)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── How to pay ──────────────────────────────────────────────────────── */}
      {pendingInvoices.length > 0 && hasPaymentMethods && (
        <section className="bg-white rounded-xl border border-rose-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">{t('howToPay')}</h2>
          <div className="space-y-4">
            {plannerPayment.bank_account && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t('bankTransfer')}</p>
                  <p className="text-sm font-mono text-gray-700 mt-0.5 break-all">{plannerPayment.bank_account}</p>
                </div>
              </div>
            )}
            {plannerPayment.accepts_bizum && plannerPayment.phone && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-blue-700">Bz</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('bizum')}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{plannerPayment.phone}</p>
                </div>
              </div>
            )}
            {plannerPayment.accepts_revolut && plannerPayment.phone && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-violet-700">Rv</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('revolut')}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{plannerPayment.phone}</p>
                </div>
              </div>
            )}
            {/* Reference to use for all payments */}
            {pendingInvoices.length > 0 && (
              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                <p className="text-xs font-medium text-amber-700 mb-1.5">{t('reference')}</p>
                <div className="flex flex-wrap gap-2">
                  {pendingInvoices.map((inv) => (
                    <span key={inv.id} className="font-mono text-sm font-semibold text-amber-900 bg-white border border-amber-200 rounded-lg px-2.5 py-1">
                      {inv.invoice_number}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Payment schedule ────────────────────────────────────────────────── */}
      {paymentSchedule.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">{t('paymentSchedule')}</h2>
          <p className="text-xs text-gray-500 mb-5">{t('paymentScheduleSubtitle')}</p>
          <div className="space-y-3">
            {paymentSchedule.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.description}</p>
                  {item.due_date && (
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(item.due_date, '')}</p>
                  )}
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

// ── Small icon components ────────────────────────────────────────────────────

function QuoteIcon() {
  return (
    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ContractIcon() {
  return (
    <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

// ── DocumentRow helper ───────────────────────────────────────────────────────

function DocumentRow({
  icon,
  iconBg,
  title,
  subtitle,
  badge,
  pdfUrl,
  pdfLabel,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  badge: React.ReactNode;
  pdfUrl?: string | null;
  pdfLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {badge}
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-rose-600 hover:text-rose-700 underline">
            {pdfLabel}
          </a>
        )}
      </div>
    </div>
  );
}
