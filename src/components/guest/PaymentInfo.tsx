/**
 * Payment Info Component
 *
 * Displays payment information including IBAN and reference code (if automated mode).
 * Shows payment status if payment has been received.
 */

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PaymentInfo as PaymentInfoType } from '../../types/api';

interface PaymentInfoProps {
  token: string;
  paymentMode: 'AUTOMATED' | 'MANUAL';
}

export default function PaymentInfo({ token, paymentMode }: PaymentInfoProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfoType | null>(null);
  const [copied, setCopied] = useState<'iban' | 'reference' | null>(null);

  useEffect(() => {
    async function loadPaymentInfo() {
      try {
        const response = await fetch(`/api/guest/${token}/payment`);
        const result = await response.json();

        if (result.success) {
          setPaymentInfo(result.data);
        }
      } catch (error) {
        console.error('Load payment info error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPaymentInfo();
  }, [token]);

  async function copyToClipboard(text: string, type: 'iban' | 'reference') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-lg text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  if (!paymentInfo) {
    return null;
  }

  const getStatusLabel = (status: string | null) => {
    if (!status) return null;
    const labels: Record<string, string> = {
      PENDING: t('guest.payment.statuses.pending'),
      RECEIVED: `${t('guest.payment.statuses.received')} ✓`,
      CONFIRMED: `${t('guest.payment.statuses.confirmed')} ✓`,
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      RECEIVED: 'bg-green-100 text-green-800',
      CONFIRMED: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        {t('guest.payment.title')} 💝
      </h3>
      <p className="text-lg text-gray-600 mb-6">
        {paymentMode === 'AUTOMATED'
          ? t('guest.payment.subtitle')
          : t('guest.payment.manualMode')}
      </p>

      {/* Payment Status */}
      {paymentInfo.payment_status && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-400 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-green-900">
                {t('guest.payment.status')}{' '}
                <span
                  className={`inline-block px-3 py-1 rounded-full text-base ${getStatusColor(paymentInfo.payment_status)}`}
                >
                  {getStatusLabel(paymentInfo.payment_status)}
                </span>
              </p>
              {paymentInfo.amount_paid && (
                <p className="text-base text-green-800 mt-1">
                  {t('admin.payments.amount')}: €{paymentInfo.amount_paid.toFixed(2)}
                </p>
              )}
            </div>
            <div className="text-4xl">✓</div>
          </div>
        </div>
      )}

      {/* IBAN */}
      <div className="mb-4">
        <label className="block text-base font-semibold text-gray-700 mb-2">
          {t('guest.payment.iban')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={paymentInfo.iban}
            readOnly
            className="flex-1 px-4 py-3 text-lg font-mono border-2 border-gray-300 rounded-lg bg-gray-50"
          />
          <button
            onClick={() => copyToClipboard(paymentInfo.iban, 'iban')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {copied === 'iban' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Reference Code (Automated Mode Only) */}
      {paymentMode === 'AUTOMATED' && paymentInfo.reference_code && (
        <div className="mb-4">
          <label className="block text-base font-semibold text-gray-700 mb-2">
            {t('guest.payment.referenceCode')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={paymentInfo.reference_code}
              readOnly
              className="flex-1 px-4 py-3 text-lg font-mono border-2 border-gray-300 rounded-lg bg-gray-50"
            />
            <button
              onClick={() =>
                copyToClipboard(paymentInfo.reference_code!, 'reference')
              }
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {copied === 'reference' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-base text-gray-600">
            ⚠️ {t('guest.payment.referenceInstructions')}
          </p>
        </div>
      )}

      {/* Thank You Message */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-lg text-center text-gray-700">
          {t('guest.payment.thankYou')} 💕
        </p>
      </div>
    </div>
  );
}
