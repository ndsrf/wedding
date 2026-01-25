/**
 * Wedding Configuration Form Component
 *
 * Form for wedding admins to configure RSVP settings and wedding details
 * Includes payment mode, guest additions, dress code, and custom RSVP questions
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { UpdateWeddingConfigRequest } from '@/types/api';
import type { Theme, Wedding } from '@/types/models';
import { PaymentMode } from '@prisma/client';

interface WeddingConfigFormData {
  payment_tracking_mode: PaymentMode;
  gift_iban: string;
  theme_id: string;
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
  themes: Theme[];
  onSubmit: (data: UpdateWeddingConfigRequest) => Promise<void>;
  onCancel: () => void;
}

export function WeddingConfigForm({ wedding, themes, onSubmit, onCancel }: WeddingConfigFormProps) {
  const t = useTranslations('admin.configure.form');
  const [formData, setFormData] = useState<WeddingConfigFormData>({
    payment_tracking_mode: wedding.payment_tracking_mode,
    gift_iban: wedding.gift_iban || '',
    theme_id: wedding.theme_id || '',
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
        gift_iban: formData.gift_iban || null,
        theme_id: formData.theme_id || null,
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
      setError(t('submitError'));
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('basicSettings')}</h3>

        {/* Theme Selection */}
        <div className="mb-6">
          <label htmlFor="theme_id" className="block text-sm font-medium text-gray-700 mb-1">
            {t('theme')}
          </label>
          <select
            id="theme_id"
            value={formData.theme_id}
            onChange={(e) => handleChange('theme_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">{t('noTheme')}</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name} {theme.is_system_theme ? `(${t('systemTheme')})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Tracking Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('paymentTrackingMode')}
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
                {t('automated')}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={formData.payment_tracking_mode === PaymentMode.MANUAL}
                onChange={() => handleChange('payment_tracking_mode', PaymentMode.MANUAL)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{t('manual')}</span>
            </label>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {t('paymentTrackingModeDesc')}
          </p>
        </div>

        {/* Gift IBAN */}
        <div className="mb-6">
          <label htmlFor="gift_iban" className="block text-sm font-medium text-gray-700 mb-1">
            {t('giftIban')}
          </label>
          <input
            id="gift_iban"
            type="text"
            value={formData.gift_iban}
            onChange={(e) => handleChange('gift_iban', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder={t('giftIbanPlaceholder')}
          />
          <p className="mt-1 text-sm text-gray-500">
            {t('giftIbanDesc')}
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
            <span className="ml-2 text-sm text-gray-700">{t('allowGuestAdditions')}</span>
          </label>
          <p className="mt-1 ml-6 text-sm text-gray-500">
            {t('allowGuestAdditionsDesc')}
          </p>
        </div>

        {/* Dress Code */}
        <div className="mb-6">
          <label htmlFor="dress_code" className="block text-sm font-medium text-gray-700 mb-1">
            {t('dressCode')}
          </label>
          <input
            id="dress_code"
            type="text"
            value={formData.dress_code}
            onChange={(e) => handleChange('dress_code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder={t('dressCodePlaceholder')}
          />
        </div>

        {/* Additional Info */}
        <div>
          <label htmlFor="additional_info" className="block text-sm font-medium text-gray-700 mb-1">
            {t('additionalInfo')}
          </label>
          <textarea
            id="additional_info"
            value={formData.additional_info}
            onChange={(e) => handleChange('additional_info', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder={t('additionalInfoPlaceholder')}
          />
        </div>
      </div>

      {/* Section: RSVP Questions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('rsvpQuestions')}</h3>
        <p className="text-sm text-gray-500 mb-6">
          {t('rsvpQuestionsDesc')}
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
              {t('transportation')}
            </span>
          </label>
          {formData.transportation_question_enabled && (
            <div className="mt-3 ml-6">
              <label className="block text-sm text-gray-600 mb-1">
                {t('transportationText')}
              </label>
              <input
                type="text"
                value={formData.transportation_question_text}
                onChange={(e) => handleChange('transportation_question_text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={t('transportationPlaceholder')}
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
              {t('dietary')}
            </span>
          </label>
          <p className="mt-1 ml-6 text-sm text-gray-500">
            {t('dietaryDesc')}
          </p>
        </div>

        {/* Extra Yes/No Questions */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">{t('extraQuestions')}</h4>

          {/* Question 1 */}
          <div className="mb-4 p-4 border border-gray-200 rounded-lg">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.extra_question_1_enabled}
                onChange={(e) => handleChange('extra_question_1_enabled', e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{t('enableQuestion', { number: 1 })}</span>
            </label>
            {formData.extra_question_1_enabled && (
              <div className="mt-3 ml-6">
                <input
                  type="text"
                  value={formData.extra_question_1_text}
                  onChange={(e) => handleChange('extra_question_1_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t('questionPlaceholder')}
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
              <span className="ml-2 text-sm text-gray-700">{t('enableQuestion', { number: 2 })}</span>
            </label>
            {formData.extra_question_2_enabled && (
              <div className="mt-3 ml-6">
                <input
                  type="text"
                  value={formData.extra_question_2_text}
                  onChange={(e) => handleChange('extra_question_2_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t('questionPlaceholder')}
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
              <span className="ml-2 text-sm text-gray-700">{t('enableQuestion', { number: 3 })}</span>
            </label>
            {formData.extra_question_3_enabled && (
              <div className="mt-3 ml-6">
                <input
                  type="text"
                  value={formData.extra_question_3_text}
                  onChange={(e) => handleChange('extra_question_3_text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t('questionPlaceholder')}
                />
              </div>
            )}
          </div>
        </div>

        {/* Extra Mandatory Info Fields */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">{t('extraInfo')}</h4>
          <p className="text-sm text-gray-500 mb-3">
            {t('extraInfoDesc')}
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
              <span className="ml-2 text-sm text-gray-700">{t('enableInfo', { number: 1 })}</span>
            </label>
            {formData.extra_info_1_enabled && (
              <div className="mt-3 ml-6">
                <label className="block text-sm text-gray-600 mb-1">{t('infoLabel')}</label>
                <input
                  type="text"
                  value={formData.extra_info_1_label}
                  onChange={(e) => handleChange('extra_info_1_label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t('infoPlaceholder')}
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
              <span className="ml-2 text-sm text-gray-700">{t('enableInfo', { number: 2 })}</span>
            </label>
            {formData.extra_info_2_enabled && (
              <div className="mt-3 ml-6">
                <label className="block text-sm text-gray-600 mb-1">{t('infoLabel')}</label>
                <input
                  type="text"
                  value={formData.extra_info_2_label}
                  onChange={(e) => handleChange('extra_info_2_label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t('infoPlaceholder')}
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
              <span className="ml-2 text-sm text-gray-700">{t('enableInfo', { number: 3 })}</span>
            </label>
            {formData.extra_info_3_enabled && (
              <div className="mt-3 ml-6">
                <label className="block text-sm text-gray-600 mb-1">{t('infoLabel')}</label>
                <input
                  type="text"
                  value={formData.extra_info_3_label}
                  onChange={(e) => handleChange('extra_info_3_label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t('infoPlaceholder')}
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
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t('saving') : t('save')}
        </button>
      </div>
    </form>
  );
}