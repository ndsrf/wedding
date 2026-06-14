/**
 * Payment Info Component
 *
 * Displays gift information including IBAN and reference code (if automated mode).
 * Shows gift status if gift has been received.
 */

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PaymentInfo as PaymentInfoType } from '../../types/api';
import type { InvStyle } from './FamilyMemberCard';

interface PaymentInfoProps {
  token: string;
  paymentMode: 'AUTOMATED' | 'MANUAL';
  invStyle?: InvStyle;
}

export default function PaymentInfo({ token, paymentMode, invStyle }: PaymentInfoProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfoType | null>(null);
  const [copied, setCopied] = useState<'iban' | 'reference' | null>(null);

  // Style helpers derived from invStyle
  const tc = invStyle?.textColor ?? '#111827';       // text color
  const bc = invStyle?.rsvpButtonColor ?? '#2563eb'; // button / accent color
  const ff = invStyle?.fontFamily;
  const borderCol = tc + '33';

  const sectionBg: React.CSSProperties = {
    backgroundColor: invStyle?.backgroundColor ? invStyle.backgroundColor + '66' : 'rgba(255, 255, 255, 0.4)',
    borderRadius: '0.5rem',
    border: `1px solid ${borderCol}`,
  };

  const inputStyle: React.CSSProperties = {
    borderColor: borderCol,
    color: tc,
    fontFamily: ff,
    backgroundColor: invStyle?.backgroundColor ? invStyle.backgroundColor + '44' : 'rgba(255, 255, 255, 0.3)',
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: invStyle?.backgroundColor ? invStyle.backgroundColor + 'aa' : 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(4px)',
    color: tc,
    fontFamily: ff,
  };

  useEffect(() => {
    async function loadPaymentInfo() {
      try {
        const response = await fetch(`/api/guest/${token}/payment`);
        const result = await response.json();

        if (result.success) {
          setPaymentInfo(result.data);
        }
      } catch (error) {
        console.error('Load gift info error:', error);
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
      <div 
        className="rounded-lg shadow-md p-6"
        style={containerStyle}
      >
        <p className="text-lg" style={{ color: tc + 'cc' }}>{t('common.loading')}</p>
      </div>
    );
  }

  // Don't render anything if IBAN is empty or no payment info
  if (!paymentInfo || !paymentInfo.iban) {
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
    if (!status) return { backgroundColor: '#f3f4f6', color: '#1f2937' };
    const colors: Record<string, { backgroundColor: string, color: string }> = {
      PENDING: { backgroundColor: '#fef3c7', color: '#92400e' },
      RECEIVED: { backgroundColor: '#dcfce7', color: '#166534' },
      CONFIRMED: { backgroundColor: '#dcfce7', color: '#166534' },
    };
    return colors[status] || { backgroundColor: '#f3f4f6', color: '#1f2937' };
  };

  return (
    <div 
      className="rounded-lg shadow-md p-6"
      style={containerStyle}
    >
      <h3 className="text-2xl font-bold mb-4" style={{ color: tc }}>
        {t('guest.payment.title')}
      </h3>

      {/* New Intro Text */}
      <div className="prose prose-blue max-w-none mb-6">
         <p className="text-lg italic" style={{ color: tc + 'cc' }}>
            {t('guest.payment.presenceMessage')}
         </p>
         <p className="text-lg mt-2" style={{ color: tc + 'cc' }}>
            {t('guest.payment.cashMessage')}
         </p>
      </div>

      {/* Payment Status */}
      {paymentInfo.payment_status && (
        <div 
          className="mb-6 p-4 border-2 rounded-lg"
          style={{ 
            backgroundColor: invStyle?.backgroundColor ? invStyle.backgroundColor + '66' : 'rgba(255, 255, 255, 0.4)',
            borderColor: borderCol
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold" style={{ color: tc }}>
                {t('guest.payment.status')}{' '}
                <span
                  className="inline-block px-3 py-1 rounded-full text-base"
                  style={getStatusColor(paymentInfo.payment_status)}
                >
                  {getStatusLabel(paymentInfo.payment_status)}
                </span>
              </p>
              {paymentInfo.amount_paid && (
                <p className="text-base mt-1" style={{ color: tc + 'bb' }}>
                  {t('admin.payments.amount')}: €{paymentInfo.amount_paid.toFixed(2)}
                </p>
              )}
            </div>
            <div className="text-4xl" style={{ color: bc }}>✓</div>
          </div>
        </div>
      )}

      {/* IBAN */}
      <div className="mb-6">
        <label className="block text-base font-semibold mb-2" style={{ color: tc }}>
          {t('guest.payment.iban')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={paymentInfo.iban}
            readOnly
            className="flex-1 px-4 py-3 text-lg font-mono font-bold border-2 rounded-lg"
            style={inputStyle}
          />
          <button
            onClick={() => copyToClipboard(paymentInfo.iban, 'iban')}
            className="px-6 py-3 text-white rounded-lg font-semibold transition-colors"
            style={{ backgroundColor: bc }}
          >
            {copied === 'iban' ? '✓' : t('common.buttons.copy')}
          </button>
        </div>
      </div>

      {/* Reference Code (Automated Mode Only) */}
      {paymentMode === 'AUTOMATED' && paymentInfo.reference_code && (
        <div className="mb-4">
          <label className="block text-base font-semibold mb-2" style={{ color: tc }}>
            {t('guest.payment.referenceCode')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={paymentInfo.reference_code}
              readOnly
              className="flex-1 px-4 py-3 text-lg font-mono font-bold border-2 rounded-lg"
              style={inputStyle}
            />
            <button
              onClick={() =>
                copyToClipboard(paymentInfo.reference_code!, 'reference')
              }
              className="px-6 py-3 text-white rounded-lg font-semibold transition-colors"
              style={{ backgroundColor: bc }}
            >
              {copied === 'reference' ? '✓' : t('common.buttons.copy')}
            </button>
          </div>
          <p className="mt-2 text-base" style={{ color: tc + 'aa' }}>
            ⚠️ {t('guest.payment.referenceInstructions')}
          </p>
        </div>
      )}

      {/* Thank You Message */}
      <div className="mt-6 p-4 rounded-lg" style={sectionBg}>
        <p className="text-lg text-center" style={{ color: tc }}>
          {t('guest.payment.thankYou')}
        </p>
      </div>
    </div>
  );
}
