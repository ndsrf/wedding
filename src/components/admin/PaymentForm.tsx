/**
 * Payment Form Component
 *
 * Form for manually recording a payment
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Family {
  id: string;
  name: string;
}

interface PaymentFormProps {
  families: Family[];
  onSubmit: (data: {
    family_id: string;
    amount: number;
    transaction_date: string;
    reference_code_used?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function PaymentForm({ families, onSubmit, onCancel }: PaymentFormProps) {
  const t = useTranslations();
  const [familyId, setFamilyId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [referenceCode, setReferenceCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!familyId) {
      setError(t('common.forms.required'));
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(t('common.validation.number'));
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        family_id: familyId,
        amount: amountNum,
        transaction_date: new Date(transactionDate).toISOString(),
        reference_code_used: referenceCode || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin.payments.recordTitle')}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Family Selection */}
        <div>
          <label htmlFor="family" className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.payments.family')} *
          </label>
          <select
            id="family"
            value={familyId}
            onChange={(e) => setFamilyId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
            required
          >
            <option value="">{t('admin.payments.selectFamily')}</option>
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            {t('admin.payments.currencyAmount', { currency: 'EUR' })} *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">€</span>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
              required
            />
          </div>
        </div>

        {/* Transaction Date */}
        <div>
          <label
            htmlFor="transaction_date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('admin.payments.transactionDate')} *
          </label>
          <input
            type="date"
            id="transaction_date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
            required
          />
        </div>

        {/* Reference Code (optional) */}
        <div>
          <label
            htmlFor="reference_code"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('admin.payments.referenceCode')}
          </label>
          <input
            type="text"
            id="reference_code"
            value={referenceCode}
            onChange={(e) => setReferenceCode(e.target.value)}
            placeholder="e.g., REF-12345"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white text-gray-900"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={submitting}
          >
            {t('common.buttons.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('admin.payments.recording') : t('admin.payments.record')}
          </button>
        </div>
      </form>
    </div>
  );
}
