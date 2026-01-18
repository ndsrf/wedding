/**
 * Wedding Configuration Form Component
 *
 * Form for wedding admins to configure RSVP settings and wedding details
 * Includes payment mode, guest additions, dress code, and custom RSVP questions
 */

'use client';

import React, { useState } from 'react';
import type { UpdateWeddingConfigRequest } from '@/types/api';
import type { Wedding } from '@/types/models';
import { PaymentMode } from '@prisma/client';

interface WeddingConfigFormData {
  payment_tracking_mode: PaymentMode;
  allow_guest_additions: boolean;
  dress_code: string;
  additional_info: string;
  transportation_question_enabled: boolean;
  transportation_question_text: string;
  dietary_restrictions_enabled: boolean;
  extra_question_1_enabled: boolean;
  extra_question_1_text: string;
  extra_question_2_enabled: boolean;
  extra_question_2_text: string;
  extra_question_3_enabled: boolean;
  extra_question_3_text: string;
  extra_info_1_enabled: boolean;
  extra_info_1_label: string;
  extra_info_2_enabled: boolean;
  extra_info_2_label: string;
  extra_info_3_enabled: boolean;
  extra_info_3_label: string;
}

interface WeddingConfigFormProps {
  wedding: Wedding;
  onSubmit: (data: UpdateWeddingConfigRequest) => Promise<void>;
  onCancel: () => void;
}

export function WeddingConfigForm({ wedding, onSubmit, onCancel }: WeddingConfigFormProps) {
  const [formData, setFormData] = useState<WeddingConfigFormData>({
    payment_tracking_mode: wedding.payment_tracking_mode,
    allow_guest_additions: wedding.allow_guest_additions,
    dress_code: wedding.dress_code || '',
    additional_info: wedding.additional_info || '',
    transportation_question_enabled: wedding.transportation_question_enabled,
    transportation_question_text: wedding.transportation_question_text || '',
    dietary_restrictions_enabled: wedding.dietary_restrictions_enabled,
    extra_question_1_enabled: wedding.extra_question_1_enabled,
    extra_question_1_text: wedding.extra_question_1_text || '',
    extra_question_2_enabled: wedding.extra_question_2_enabled,
    extra_question_2_text: wedding.extra_question_2_text || '',
    extra_question_3_enabled: wedding.extra_question_3_enabled,
    extra_question_3_text: wedding.extra_question_3_text || '',
    extra_info_1_enabled: wedding.extra_info_1_enabled,
    extra_info_1_label: wedding.extra_info_1_label || '',
    extra_info_2_enabled: wedding.extra_info_2_enabled,
    extra_info_2_label: wedding.extra_info_2_label || '',
    extra_info_3_enabled: wedding.extra_info_3_enabled,
    extra_info_3_label: wedding.extra_info_3_label || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const updateData: UpdateWeddingConfigRequest = {
        payment_tracking_mode: formData.payment_tracking_mode,
        allow_guest_additions: formData.allow_guest_additions,
        dress_code: formData.dress_code || null,
        additional_info: formData.additional_info || null,
        transportation_question_enabled: formData.transportation_question_enabled,
        transportation_question_text: formData.transportation_question_enabled
          ? formData.transportation_question_text || null
          : null,
        dietary_restrictions_enabled: formData.dietary_restrictions_enabled,
        extra_question_1_enabled: formData.extra_question_1_enabled,
        extra_question_1_text: formData.extra_question_1_enabled
          ? formData.extra_question_1_text || null
          : null,
        extra_question_2_enabled: formData.extra_question_2_enabled,
        extra_question_2_text: formData.extra_question_2_enabled
          ? formData.extra_question_2_text || null
          : null,
        extra_question_3_enabled: formData.extra_question_3_enabled,
        extra_question_3_text: formData.extra_question_3_enabled
          ? formData.extra_question_3_text || null
          : null,
        extra_info_1_enabled: formData.extra_info_1_enabled,
        extra_info_1_label: formData.extra_info_1_enabled
          ? formData.extra_info_1_label || null
          : null,
        extra_info_2_enabled: formData.extra_info_2_enabled,
        extra_info_2_label: formData.extra_info_2_enabled
          ? formData.extra_info_2_label || null
          : null,
        extra_info_3_enabled: formData.extra_info_3_enabled,
        extra_info_3_label: formData.extra_info_3_enabled
          ? formData.extra_info_3_label || null
          : null,
      };

      await onSubmit(updateData);
    } catch (err) {
      console.error('Form submission error:', err);
      setError('Failed to save configuration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = <K extends keyof WeddingConfigFormData>(
    field: K,
    value: WeddingConfigFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Section: Basic Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>

        {/* Payment Tracking Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Tracking Mode
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                checked={formData.payment_tracking_mode === PaymentMode.AUTOMATED}
                onChange={() => handleChange('payment_tracking_mode', PaymentMode.AUTOMATED)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">
                Automated (with reference codes)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={formData.payment_tracking_mode === PaymentMode.MANUAL}
                onChange={() => handleChange('payment_tracking_mode', PaymentMode.MANUAL)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Manual tracking</span>
            </label>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Automated mode generates unique reference codes for each family to track bank transfers.
          </p>
        </div>

        {/* Allow Guest Additions */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.allow_guest_additions}
              onChange={(e) => handleChange('allow_guest_additions', e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Allow guests to add family members</span>
          </label>
          <p className="mt-1 ml-6 text-sm text-gray-500">
            When enabled, guests can add additional family members during RSVP (subject to your review).
          </p>
        </div>

        {/* Dress Code */}
        <div className="mb-6">
          <label htmlFor="dress_code" className="block text-sm font-medium text-gray-700 mb-1">
            Dress Code
          </label>
          <input
            id="dress_code"
            type="text"
            value={formData.dress_code}
            onChange={(e) => handleChange('dress_code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="e.g., Formal, Semi-formal, Casual"
          />
        </div>

        {/* Additional Info */}
        <div>
          <label htmlFor="additional_info" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Information for Guests
          </label>
          <textarea
            id="additional_info"
            value={formData.additional_info}
            onChange={(e) => handleChange('additional_info', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Any additional details for guests (parking, accommodation, etc.)..."
          />
        </div>
      </div>

      {/* Section: RSVP Questions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">RSVP Questions</h3>
        <p className="text-sm text-gray-500 mb-6">
          Customize the questions shown to guests when they complete their RSVP.
        </p>

        {/* Transportation Question */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.transportation_question_enabled}
              onChange={(e) => handleChange('transportation_question_enabled', e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              Add transportation question to RSVP
            </span>
          </label>
          {formData.transportation_question_enabled && (
            <div className="mt-3 ml-6">
              <label className="block text-sm text-gray-600 mb-1">
                Question text (Yes/No question)
              </label>
              <input
                type="text"
                value={formData.transportation_question_text}
                onChange={(e) => handleChange('transportation_question_text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Do you need transportation from the hotel to the venue?"
              />
            </div>
          )}
        </div>

        {/* Dietary Restrictions */}
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.dietary_restrictions_enabled}
              onChange={(e) => handleChange('dietary_restrictions_enabled', e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              Add dietary restrictions question to RSVP
            </span>
          </label>
          <p className="mt-1 ml-6 text-sm text-gray-500">
            Guests will be able to select from: No restrictions, Vegetarian, Vegan, Gluten-free, Other, and specify allergies.
          </p>
        </div>

        {/* Extra Yes/No Questions */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Extra Yes/No Questions (up to 3)</h4>

          {/* Question 1 */}
          <div className="mb-4 p-4 border border-gray-200 rounded-lg">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.extra_question_1_enabled}
                onChange={(e) => handleChange('extra_question_1_enabled', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable extra question 1</span>
            </label>
            {formData.extra_question_1_enabled && (
              <div className="mt-3 ml-6">
                <input
                  type="text"
                  value={formData.extra_question_1_text}
                  onChange={(e) => handleChange('extra_question_1_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your Yes/No question..."
                />
              </div>
            )}
          </div>

          {/* Question 2 */}
          <div className="mb-4 p-4 border border-gray-200 rounded-lg">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.extra_question_2_enabled}
                onChange={(e) => handleChange('extra_question_2_enabled', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable extra question 2</span>
            </label>
            {formData.extra_question_2_enabled && (
              <div className="mt-3 ml-6">
                <input
                  type="text"
                  value={formData.extra_question_2_text}
                  onChange={(e) => handleChange('extra_question_2_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your Yes/No question..."
                />
              </div>
            )}
          </div>

          {/* Question 3 */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.extra_question_3_enabled}
                onChange={(e) => handleChange('extra_question_3_enabled', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable extra question 3</span>
            </label>
            {formData.extra_question_3_enabled && (
              <div className="mt-3 ml-6">
                <input
                  type="text"
                  value={formData.extra_question_3_text}
                  onChange={(e) => handleChange('extra_question_3_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your Yes/No question..."
                />
              </div>
            )}
          </div>
        </div>

        {/* Extra Mandatory Info Fields */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Extra Mandatory Information Fields (up to 3)</h4>
          <p className="text-sm text-gray-500 mb-3">
            Add custom text fields that guests must fill in during RSVP.
          </p>

          {/* Info Field 1 */}
          <div className="mb-4 p-4 border border-gray-200 rounded-lg">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.extra_info_1_enabled}
                onChange={(e) => handleChange('extra_info_1_enabled', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable mandatory field 1</span>
            </label>
            {formData.extra_info_1_enabled && (
              <div className="mt-3 ml-6">
                <label className="block text-sm text-gray-600 mb-1">Field label</label>
                <input
                  type="text"
                  value={formData.extra_info_1_label}
                  onChange={(e) => handleChange('extra_info_1_label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Song request for the party"
                />
              </div>
            )}
          </div>

          {/* Info Field 2 */}
          <div className="mb-4 p-4 border border-gray-200 rounded-lg">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.extra_info_2_enabled}
                onChange={(e) => handleChange('extra_info_2_enabled', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable mandatory field 2</span>
            </label>
            {formData.extra_info_2_enabled && (
              <div className="mt-3 ml-6">
                <label className="block text-sm text-gray-600 mb-1">Field label</label>
                <input
                  type="text"
                  value={formData.extra_info_2_label}
                  onChange={(e) => handleChange('extra_info_2_label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Message for the couple"
                />
              </div>
            )}
          </div>

          {/* Info Field 3 */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.extra_info_3_enabled}
                onChange={(e) => handleChange('extra_info_3_enabled', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable mandatory field 3</span>
            </label>
            {formData.extra_info_3_enabled && (
              <div className="mt-3 ml-6">
                <label className="block text-sm text-gray-600 mb-1">Field label</label>
                <input
                  type="text"
                  value={formData.extra_info_3_label}
                  onChange={(e) => handleChange('extra_info_3_label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Special requests"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
