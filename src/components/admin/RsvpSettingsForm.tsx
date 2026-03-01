/**
 * RSVP Settings Form Component
 *
 * Form for configuring RSVP questions including transportation, dietary restrictions, and extra questions
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { UpdateWeddingConfigRequest } from '@/types/api';
import type { Wedding } from '@/types/models';
import { PaymentMode } from '@prisma/client';

interface RsvpSettingsFormData {
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

interface RsvpSettingsFormProps {
  wedding: Wedding;
  onSubmit: (data: UpdateWeddingConfigRequest) => Promise<void>;
  onCancel: () => void;
}

export function RsvpSettingsForm({ wedding, onSubmit, onCancel }: RsvpSettingsFormProps) {
  const t = useTranslations('admin.configure.form');
  const [formData, setFormData] = useState<RsvpSettingsFormData>({
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
  const [copied, setCopied] = useState(false);

  const invitationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/w/${wedding.short_url_initials}`
    : '';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

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
        save_the_date_enabled: wedding.save_the_date_enabled,
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

  const handleChange = <K extends keyof RsvpSettingsFormData>(
    field: K,
    value: RsvpSettingsFormData[K]
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

      {/* Invitation URL Section */}
      {wedding.short_url_initials && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-6">
          <h3 className="text-lg font-medium text-purple-900 mb-2">{t('invitationUrl')}</h3>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-white border border-purple-200 rounded-md px-4 py-2 text-purple-900 font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap">
              {invitationUrl}
            </div>
            <button
              type="button"
              onClick={handleCopyUrl}
              className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {copied ? (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('copySuccess')}
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {t('copyUrl')}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
      </div>

      {/* RSVP Questions Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{t('rsvpQuestions')}</h3>
        <p className="text-sm text-gray-500 mb-6">
          {t('rsvpQuestionsDesc')}
        </p>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
