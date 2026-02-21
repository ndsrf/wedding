'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { WeddingWithRelations } from '../WeddingWizard';

interface PaymentGiftsStepProps {
  wedding: WeddingWithRelations;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function PaymentGiftsStep({ wedding, onNext, onBack }: PaymentGiftsStepProps) {
  const [formData, setFormData] = useState({
    payment_tracking_mode: wedding.payment_tracking_mode || 'MANUAL',
    gift_iban: wedding.gift_iban || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/wedding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save payment settings');
      }

      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment & Gift Tracking</h2>
        <p className="mt-2 text-gray-600">
          Configure how you want to track gifts and payments from your guests.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Payment Tracking Mode */}
        <div>
          <label htmlFor="payment_tracking_mode" className="block text-sm font-medium text-gray-700">
            Payment Tracking Mode
          </label>
          <select
            id="payment_tracking_mode"
            name="payment_tracking_mode"
            value={formData.payment_tracking_mode}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
          >
            <option value="MANUAL">Manual - I&apos;ll track payments manually</option>
            <option value="AUTOMATED">Automated - Auto-match payments by reference code</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            {formData.payment_tracking_mode === 'AUTOMATED'
              ? 'Each guest will receive a unique reference code for bank transfers. Payments will be auto-matched.'
              : 'You can manually record payments and gifts as they arrive.'}
          </p>
        </div>

        {/* Gift IBAN */}
        <div>
          <label htmlFor="gift_iban" className="block text-sm font-medium text-gray-700">
            Bank Account (IBAN) for Gifts
            {formData.payment_tracking_mode === 'AUTOMATED' && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          <input
            type="text"
            id="gift_iban"
            name="gift_iban"
            value={formData.gift_iban}
            onChange={handleChange}
            placeholder="ES12 1234 5678 9012 3456 7890"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
          />
          <p className="mt-1 text-sm text-gray-500">
            Your bank account number for receiving monetary gifts. This will be shown to guests.
          </p>
        </div>

        {/* Payment Tracking Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">How payment tracking works:</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Track which guests have sent gifts or payments</span>
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Record payment amounts and methods</span>
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>View payment reports and analytics</span>
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-purple-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Send thank you messages to gift senders</span>
            </li>
          </ul>
        </div>

        {/* Link to Payments Page */}
        <Link
          href="/admin/payments"
          target="_blank"
          className="block p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all group"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-gray-900 group-hover:text-purple-600">
                Manage Payments
              </h4>
              <p className="mt-1 text-xs text-gray-600">
                View and record payments in the Payments page
              </p>
              <div className="mt-1 flex items-center text-xs text-purple-600 group-hover:underline">
                <span>Open payments page</span>
                <svg className="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <svg className="mr-2 -ml-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || (formData.payment_tracking_mode === 'AUTOMATED' && !formData.gift_iban)}
          className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save & Continue'}
          <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
