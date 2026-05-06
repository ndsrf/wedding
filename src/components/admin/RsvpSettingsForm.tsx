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

type QuestionLanguage = 'es' | 'en' | 'fr' | 'it' | 'de';

const QUESTION_LANGUAGES: { code: QuestionLanguage; label: string; flag: string }[] = [
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'it', label: 'IT', flag: '🇮🇹' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
];

interface RsvpSettingsFormData {
  payment_tracking_mode: PaymentMode;
  gift_iban: string;
  theme_id: string;
  allow_guest_additions: boolean;
  dress_code: string;
  additional_info: string;
  transportation_question_enabled: boolean;
  transportation_question_text: string;
  transportation_question_text_en: string;
  transportation_question_text_fr: string;
  transportation_question_text_it: string;
  transportation_question_text_de: string;
  dietary_restrictions_enabled: boolean;
  extra_question_1_enabled: boolean;
  extra_question_1_text: string;
  extra_question_1_text_en: string;
  extra_question_1_text_fr: string;
  extra_question_1_text_it: string;
  extra_question_1_text_de: string;
  extra_question_2_enabled: boolean;
  extra_question_2_text: string;
  extra_question_2_text_en: string;
  extra_question_2_text_fr: string;
  extra_question_2_text_it: string;
  extra_question_2_text_de: string;
  extra_question_3_enabled: boolean;
  extra_question_3_text: string;
  extra_question_3_text_en: string;
  extra_question_3_text_fr: string;
  extra_question_3_text_it: string;
  extra_question_3_text_de: string;
  extra_info_1_enabled: boolean;
  extra_info_1_label: string;
  extra_info_1_label_en: string;
  extra_info_1_label_fr: string;
  extra_info_1_label_it: string;
  extra_info_1_label_de: string;
  extra_info_2_enabled: boolean;
  extra_info_2_label: string;
  extra_info_2_label_en: string;
  extra_info_2_label_fr: string;
  extra_info_2_label_it: string;
  extra_info_2_label_de: string;
  extra_info_3_enabled: boolean;
  extra_info_3_label: string;
  extra_info_3_label_en: string;
  extra_info_3_label_fr: string;
  extra_info_3_label_it: string;
  extra_info_3_label_de: string;
}

interface RsvpSettingsFormProps {
  wedding: Wedding;
  onSubmit: (data: UpdateWeddingConfigRequest) => Promise<void>;
  onCancel: () => void;
}

// Language tabs component for entering multilingual question text
function LanguageTabs({
  values,
  onChange,
  placeholder,
}: {
  values: Record<QuestionLanguage, string>;
  onChange: (lang: QuestionLanguage, value: string) => void;
  placeholder?: string;
}) {
  const [activeTab, setActiveTab] = useState<QuestionLanguage>('es');

  return (
    <div className="mt-3 ml-6">
      <div className="flex border-b border-gray-200 mb-2">
        {QUESTION_LANGUAGES.map(({ code, label, flag }) => (
          <button
            key={code}
            type="button"
            onClick={() => setActiveTab(code)}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === code
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {flag} {label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={values[activeTab]}
        onChange={(e) => onChange(activeTab, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
        placeholder={placeholder}
      />
    </div>
  );
}

// Helper to get language-specific values for a question field prefix (e.g. "extra_question_1_text")
function getTextValues(
  formData: RsvpSettingsFormData,
  esKey: keyof RsvpSettingsFormData,
  enKey: keyof RsvpSettingsFormData,
  frKey: keyof RsvpSettingsFormData,
  itKey: keyof RsvpSettingsFormData,
  deKey: keyof RsvpSettingsFormData,
): Record<QuestionLanguage, string> {
  return {
    es: formData[esKey] as string,
    en: formData[enKey] as string,
    fr: formData[frKey] as string,
    it: formData[itKey] as string,
    de: formData[deKey] as string,
  };
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
    transportation_question_text_en: (wedding as Record<string, unknown>).transportation_question_text_en as string || '',
    transportation_question_text_fr: (wedding as Record<string, unknown>).transportation_question_text_fr as string || '',
    transportation_question_text_it: (wedding as Record<string, unknown>).transportation_question_text_it as string || '',
    transportation_question_text_de: (wedding as Record<string, unknown>).transportation_question_text_de as string || '',
    dietary_restrictions_enabled: wedding.dietary_restrictions_enabled,
    extra_question_1_enabled: wedding.extra_question_1_enabled,
    extra_question_1_text: wedding.extra_question_1_text || '',
    extra_question_1_text_en: (wedding as Record<string, unknown>).extra_question_1_text_en as string || '',
    extra_question_1_text_fr: (wedding as Record<string, unknown>).extra_question_1_text_fr as string || '',
    extra_question_1_text_it: (wedding as Record<string, unknown>).extra_question_1_text_it as string || '',
    extra_question_1_text_de: (wedding as Record<string, unknown>).extra_question_1_text_de as string || '',
    extra_question_2_enabled: wedding.extra_question_2_enabled,
    extra_question_2_text: wedding.extra_question_2_text || '',
    extra_question_2_text_en: (wedding as Record<string, unknown>).extra_question_2_text_en as string || '',
    extra_question_2_text_fr: (wedding as Record<string, unknown>).extra_question_2_text_fr as string || '',
    extra_question_2_text_it: (wedding as Record<string, unknown>).extra_question_2_text_it as string || '',
    extra_question_2_text_de: (wedding as Record<string, unknown>).extra_question_2_text_de as string || '',
    extra_question_3_enabled: wedding.extra_question_3_enabled,
    extra_question_3_text: wedding.extra_question_3_text || '',
    extra_question_3_text_en: (wedding as Record<string, unknown>).extra_question_3_text_en as string || '',
    extra_question_3_text_fr: (wedding as Record<string, unknown>).extra_question_3_text_fr as string || '',
    extra_question_3_text_it: (wedding as Record<string, unknown>).extra_question_3_text_it as string || '',
    extra_question_3_text_de: (wedding as Record<string, unknown>).extra_question_3_text_de as string || '',
    extra_info_1_enabled: wedding.extra_info_1_enabled,
    extra_info_1_label: wedding.extra_info_1_label || '',
    extra_info_1_label_en: (wedding as Record<string, unknown>).extra_info_1_label_en as string || '',
    extra_info_1_label_fr: (wedding as Record<string, unknown>).extra_info_1_label_fr as string || '',
    extra_info_1_label_it: (wedding as Record<string, unknown>).extra_info_1_label_it as string || '',
    extra_info_1_label_de: (wedding as Record<string, unknown>).extra_info_1_label_de as string || '',
    extra_info_2_enabled: wedding.extra_info_2_enabled,
    extra_info_2_label: wedding.extra_info_2_label || '',
    extra_info_2_label_en: (wedding as Record<string, unknown>).extra_info_2_label_en as string || '',
    extra_info_2_label_fr: (wedding as Record<string, unknown>).extra_info_2_label_fr as string || '',
    extra_info_2_label_it: (wedding as Record<string, unknown>).extra_info_2_label_it as string || '',
    extra_info_2_label_de: (wedding as Record<string, unknown>).extra_info_2_label_de as string || '',
    extra_info_3_enabled: wedding.extra_info_3_enabled,
    extra_info_3_label: wedding.extra_info_3_label || '',
    extra_info_3_label_en: (wedding as Record<string, unknown>).extra_info_3_label_en as string || '',
    extra_info_3_label_fr: (wedding as Record<string, unknown>).extra_info_3_label_fr as string || '',
    extra_info_3_label_it: (wedding as Record<string, unknown>).extra_info_3_label_it as string || '',
    extra_info_3_label_de: (wedding as Record<string, unknown>).extra_info_3_label_de as string || '',
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
        transportation_question_text_en: formData.transportation_question_enabled
          ? formData.transportation_question_text_en || null
          : null,
        transportation_question_text_fr: formData.transportation_question_enabled
          ? formData.transportation_question_text_fr || null
          : null,
        transportation_question_text_it: formData.transportation_question_enabled
          ? formData.transportation_question_text_it || null
          : null,
        transportation_question_text_de: formData.transportation_question_enabled
          ? formData.transportation_question_text_de || null
          : null,
        dietary_restrictions_enabled: formData.dietary_restrictions_enabled,
        extra_question_1_enabled: formData.extra_question_1_enabled,
        extra_question_1_text: formData.extra_question_1_enabled ? formData.extra_question_1_text || null : null,
        extra_question_1_text_en: formData.extra_question_1_enabled ? formData.extra_question_1_text_en || null : null,
        extra_question_1_text_fr: formData.extra_question_1_enabled ? formData.extra_question_1_text_fr || null : null,
        extra_question_1_text_it: formData.extra_question_1_enabled ? formData.extra_question_1_text_it || null : null,
        extra_question_1_text_de: formData.extra_question_1_enabled ? formData.extra_question_1_text_de || null : null,
        extra_question_2_enabled: formData.extra_question_2_enabled,
        extra_question_2_text: formData.extra_question_2_enabled ? formData.extra_question_2_text || null : null,
        extra_question_2_text_en: formData.extra_question_2_enabled ? formData.extra_question_2_text_en || null : null,
        extra_question_2_text_fr: formData.extra_question_2_enabled ? formData.extra_question_2_text_fr || null : null,
        extra_question_2_text_it: formData.extra_question_2_enabled ? formData.extra_question_2_text_it || null : null,
        extra_question_2_text_de: formData.extra_question_2_enabled ? formData.extra_question_2_text_de || null : null,
        extra_question_3_enabled: formData.extra_question_3_enabled,
        extra_question_3_text: formData.extra_question_3_enabled ? formData.extra_question_3_text || null : null,
        extra_question_3_text_en: formData.extra_question_3_enabled ? formData.extra_question_3_text_en || null : null,
        extra_question_3_text_fr: formData.extra_question_3_enabled ? formData.extra_question_3_text_fr || null : null,
        extra_question_3_text_it: formData.extra_question_3_enabled ? formData.extra_question_3_text_it || null : null,
        extra_question_3_text_de: formData.extra_question_3_enabled ? formData.extra_question_3_text_de || null : null,
        extra_info_1_enabled: formData.extra_info_1_enabled,
        extra_info_1_label: formData.extra_info_1_enabled ? formData.extra_info_1_label || null : null,
        extra_info_1_label_en: formData.extra_info_1_enabled ? formData.extra_info_1_label_en || null : null,
        extra_info_1_label_fr: formData.extra_info_1_enabled ? formData.extra_info_1_label_fr || null : null,
        extra_info_1_label_it: formData.extra_info_1_enabled ? formData.extra_info_1_label_it || null : null,
        extra_info_1_label_de: formData.extra_info_1_enabled ? formData.extra_info_1_label_de || null : null,
        extra_info_2_enabled: formData.extra_info_2_enabled,
        extra_info_2_label: formData.extra_info_2_enabled ? formData.extra_info_2_label || null : null,
        extra_info_2_label_en: formData.extra_info_2_enabled ? formData.extra_info_2_label_en || null : null,
        extra_info_2_label_fr: formData.extra_info_2_enabled ? formData.extra_info_2_label_fr || null : null,
        extra_info_2_label_it: formData.extra_info_2_enabled ? formData.extra_info_2_label_it || null : null,
        extra_info_2_label_de: formData.extra_info_2_enabled ? formData.extra_info_2_label_de || null : null,
        extra_info_3_enabled: formData.extra_info_3_enabled,
        extra_info_3_label: formData.extra_info_3_enabled ? formData.extra_info_3_label || null : null,
        extra_info_3_label_en: formData.extra_info_3_enabled ? formData.extra_info_3_label_en || null : null,
        extra_info_3_label_fr: formData.extra_info_3_enabled ? formData.extra_info_3_label_fr || null : null,
        extra_info_3_label_it: formData.extra_info_3_enabled ? formData.extra_info_3_label_it || null : null,
        extra_info_3_label_de: formData.extra_info_3_enabled ? formData.extra_info_3_label_de || null : null,
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

  // Helper to handle language tab changes for a group of fields
  const handleLangChange = (
    lang: QuestionLanguage,
    value: string,
    esKey: keyof RsvpSettingsFormData,
    enKey: keyof RsvpSettingsFormData,
    frKey: keyof RsvpSettingsFormData,
    itKey: keyof RsvpSettingsFormData,
    deKey: keyof RsvpSettingsFormData,
  ) => {
    const keyMap: Record<QuestionLanguage, keyof RsvpSettingsFormData> = {
      es: esKey, en: enKey, fr: frKey, it: itKey, de: deKey,
    };
    handleChange(keyMap[lang], value as RsvpSettingsFormData[typeof keyMap[typeof lang]]);
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
            <>
              <p className="mt-2 ml-6 text-xs text-gray-500">{t('questionLanguageHint')}</p>
              <LanguageTabs
                values={getTextValues(formData,
                  'transportation_question_text', 'transportation_question_text_en',
                  'transportation_question_text_fr', 'transportation_question_text_it',
                  'transportation_question_text_de')}
                onChange={(lang, value) => handleLangChange(lang, value,
                  'transportation_question_text', 'transportation_question_text_en',
                  'transportation_question_text_fr', 'transportation_question_text_it',
                  'transportation_question_text_de')}
                placeholder={t('transportationPlaceholder')}
              />
            </>
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
              <>
                <p className="mt-2 ml-6 text-xs text-gray-500">{t('questionLanguageHint')}</p>
                <LanguageTabs
                  values={getTextValues(formData,
                    'extra_question_1_text', 'extra_question_1_text_en',
                    'extra_question_1_text_fr', 'extra_question_1_text_it',
                    'extra_question_1_text_de')}
                  onChange={(lang, value) => handleLangChange(lang, value,
                    'extra_question_1_text', 'extra_question_1_text_en',
                    'extra_question_1_text_fr', 'extra_question_1_text_it',
                    'extra_question_1_text_de')}
                  placeholder={t('questionPlaceholder')}
                />
              </>
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
              <>
                <p className="mt-2 ml-6 text-xs text-gray-500">{t('questionLanguageHint')}</p>
                <LanguageTabs
                  values={getTextValues(formData,
                    'extra_question_2_text', 'extra_question_2_text_en',
                    'extra_question_2_text_fr', 'extra_question_2_text_it',
                    'extra_question_2_text_de')}
                  onChange={(lang, value) => handleLangChange(lang, value,
                    'extra_question_2_text', 'extra_question_2_text_en',
                    'extra_question_2_text_fr', 'extra_question_2_text_it',
                    'extra_question_2_text_de')}
                  placeholder={t('questionPlaceholder')}
                />
              </>
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
              <>
                <p className="mt-2 ml-6 text-xs text-gray-500">{t('questionLanguageHint')}</p>
                <LanguageTabs
                  values={getTextValues(formData,
                    'extra_question_3_text', 'extra_question_3_text_en',
                    'extra_question_3_text_fr', 'extra_question_3_text_it',
                    'extra_question_3_text_de')}
                  onChange={(lang, value) => handleLangChange(lang, value,
                    'extra_question_3_text', 'extra_question_3_text_en',
                    'extra_question_3_text_fr', 'extra_question_3_text_it',
                    'extra_question_3_text_de')}
                  placeholder={t('questionPlaceholder')}
                />
              </>
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
              <>
                <p className="mt-2 ml-6 text-xs text-gray-500">{t('questionLanguageHint')}</p>
                <LanguageTabs
                  values={getTextValues(formData,
                    'extra_info_1_label', 'extra_info_1_label_en',
                    'extra_info_1_label_fr', 'extra_info_1_label_it',
                    'extra_info_1_label_de')}
                  onChange={(lang, value) => handleLangChange(lang, value,
                    'extra_info_1_label', 'extra_info_1_label_en',
                    'extra_info_1_label_fr', 'extra_info_1_label_it',
                    'extra_info_1_label_de')}
                  placeholder={t('infoPlaceholder')}
                />
              </>
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
              <>
                <p className="mt-2 ml-6 text-xs text-gray-500">{t('questionLanguageHint')}</p>
                <LanguageTabs
                  values={getTextValues(formData,
                    'extra_info_2_label', 'extra_info_2_label_en',
                    'extra_info_2_label_fr', 'extra_info_2_label_it',
                    'extra_info_2_label_de')}
                  onChange={(lang, value) => handleLangChange(lang, value,
                    'extra_info_2_label', 'extra_info_2_label_en',
                    'extra_info_2_label_fr', 'extra_info_2_label_it',
                    'extra_info_2_label_de')}
                  placeholder={t('infoPlaceholder')}
                />
              </>
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
              <>
                <p className="mt-2 ml-6 text-xs text-gray-500">{t('questionLanguageHint')}</p>
                <LanguageTabs
                  values={getTextValues(formData,
                    'extra_info_3_label', 'extra_info_3_label_en',
                    'extra_info_3_label_fr', 'extra_info_3_label_it',
                    'extra_info_3_label_de')}
                  onChange={(lang, value) => handleLangChange(lang, value,
                    'extra_info_3_label', 'extra_info_3_label_en',
                    'extra_info_3_label_fr', 'extra_info_3_label_it',
                    'extra_info_3_label_de')}
                  placeholder={t('infoPlaceholder')}
                />
              </>
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
