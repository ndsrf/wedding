/**
 * Wedding Form Component
 *
 * Form for creating and editing weddings
 * Includes all required fields and validation
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CreateWeddingRequest } from '@/types/api';
import type { Theme, Wedding } from '@/types/models';
import { Language, PaymentMode, WhatsAppMode } from '@prisma/client';
import { COUNTRIES } from '@/lib/phone-utils';

interface WeddingFormData extends Omit<CreateWeddingRequest, 'wedding_date' | 'rsvp_cutoff_date'> {
  wedding_date: string;
  rsvp_cutoff_date: string;
}

interface WeddingFormProps {
  onSubmit: (data: CreateWeddingRequest) => Promise<void>;
  onCancel: () => void;
  initialData?: Wedding;
  themes?: Theme[];
}

export function WeddingForm({ onSubmit, onCancel, initialData, themes = [] }: WeddingFormProps) {
  const t = useTranslations();
  // Note: payment_tracking_mode, allow_guest_additions, dress_code, and additional_info
  // are now managed by the wedding admin in /admin/configure. Default values are set here
  // for wedding creation, but the wedding admin can change them later.
  const [formData, setFormData] = useState<WeddingFormData>({
    couple_names: initialData?.couple_names || '',
    wedding_date: initialData?.wedding_date
      ? new Date(initialData.wedding_date).toISOString().split('T')[0]
      : '',
    wedding_time: initialData?.wedding_time || '',
    location: initialData?.location || '',
    rsvp_cutoff_date: initialData?.rsvp_cutoff_date
      ? new Date(initialData.rsvp_cutoff_date).toISOString().split('T')[0]
      : '',
    dress_code: initialData?.dress_code || '',
    additional_info: initialData?.additional_info || '',
    theme_id: initialData?.theme_id || undefined,
    payment_tracking_mode: initialData?.payment_tracking_mode || PaymentMode.MANUAL,
    allow_guest_additions: initialData?.allow_guest_additions ?? true,
    default_language: initialData?.default_language || Language.ES,
    wedding_country: initialData?.wedding_country || 'ES',
    whatsapp_mode: initialData?.whatsapp_mode || WhatsAppMode.BUSINESS,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof WeddingFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof WeddingFormData, string>> = {};

    if (!formData.couple_names.trim()) {
      newErrors.couple_names = t('planner.weddings.validation.coupleNamesRequired');
    }

    if (!formData.wedding_date) {
      newErrors.wedding_date = t('planner.weddings.validation.weddingDateRequired');
    }

    if (!formData.wedding_time.trim()) {
      newErrors.wedding_time = t('planner.weddings.validation.weddingTimeRequired');
    }

    if (!formData.location.trim()) {
      newErrors.location = t('planner.weddings.validation.locationRequired');
    }

    if (!formData.rsvp_cutoff_date) {
      newErrors.rsvp_cutoff_date = t('planner.weddings.validation.rsvpCutoffRequired');
    } else if (
      formData.wedding_date &&
      new Date(formData.rsvp_cutoff_date) >= new Date(formData.wedding_date)
    ) {
      newErrors.rsvp_cutoff_date = t('planner.weddings.validation.rsvpCutoffInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    field: keyof WeddingFormData,
    value: string | boolean | PaymentMode | Language | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Couple Names */}
      <div>
        <label htmlFor="couple_names" className="block text-sm font-medium text-gray-700 mb-1">
          {t('planner.weddings.coupleNames')} *
        </label>
        <input
          id="couple_names"
          type="text"
          value={formData.couple_names}
          onChange={(e) => handleChange('couple_names', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.couple_names ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t('planner.weddings.placeholders.coupleNames')}
        />
        {errors.couple_names && <p className="mt-1 text-sm text-red-600">{errors.couple_names}</p>}
      </div>

      {/* Wedding Date and Time */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="wedding_date" className="block text-sm font-medium text-gray-700 mb-1">
            {t('planner.weddings.weddingDate')} *
          </label>
          <input
            id="wedding_date"
            type="date"
            value={formData.wedding_date}
            onChange={(e) => handleChange('wedding_date', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.wedding_date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.wedding_date && <p className="mt-1 text-sm text-red-600">{errors.wedding_date}</p>}
        </div>

        <div>
          <label htmlFor="wedding_time" className="block text-sm font-medium text-gray-700 mb-1">
            {t('planner.weddings.weddingTime')} *
          </label>
          <input
            id="wedding_time"
            type="time"
            value={formData.wedding_time}
            onChange={(e) => handleChange('wedding_time', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.wedding_time ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.wedding_time && <p className="mt-1 text-sm text-red-600">{errors.wedding_time}</p>}
        </div>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
          {t('planner.weddings.location')} *
        </label>
        <input
          id="location"
          type="text"
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.location ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t('planner.weddings.placeholders.location')}
        />
        {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
      </div>

      {/* RSVP Cutoff Date */}
      <div>
        <label htmlFor="rsvp_cutoff_date" className="block text-sm font-medium text-gray-700 mb-1">
          {t('planner.weddings.rsvpCutoff')} *
        </label>
        <input
          id="rsvp_cutoff_date"
          type="date"
          value={formData.rsvp_cutoff_date}
          onChange={(e) => handleChange('rsvp_cutoff_date', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.rsvp_cutoff_date ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.rsvp_cutoff_date && (
          <p className="mt-1 text-sm text-red-600">{errors.rsvp_cutoff_date}</p>
        )}
      </div>

      {/* Theme Selection */}
      {themes.length > 0 && (
        <div>
          <label htmlFor="theme_id" className="block text-sm font-medium text-gray-700 mb-1">
            {t('planner.weddings.theme')} ({t('common.optional')})
          </label>
          <select
            id="theme_id"
            value={formData.theme_id || ''}
            onChange={(e) => handleChange('theme_id', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('planner.weddings.noTheme')}</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name} {theme.is_system_theme ? `(${t('planner.themes.system')})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Default Language */}
      <div>
        <label htmlFor="default_language" className="block text-sm font-medium text-gray-700 mb-1">
          {t('planner.weddings.defaultLanguage')} *
        </label>
        <select
          id="default_language"
          value={formData.default_language}
          onChange={(e) => handleChange('default_language', e.target.value as Language)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={Language.ES}>{t('common.languages.ES')} (Español)</option>
          <option value={Language.EN}>{t('common.languages.EN')}</option>
          <option value={Language.FR}>{t('common.languages.FR')} (Français)</option>
          <option value={Language.IT}>{t('common.languages.IT')} (Italiano)</option>
          <option value={Language.DE}>{t('common.languages.DE')} (Deutsch)</option>
        </select>
      </div>

      {/* Wedding Country */}
      <div>
        <label htmlFor="wedding_country" className="block text-sm font-medium text-gray-700 mb-1">
          {t('planner.weddings.weddingCountry')} *
          <span className="ml-2 text-xs text-gray-500" title={t('planner.weddings.weddingCountryTooltip')}>
            ℹ️ {t('planner.weddings.weddingCountryTooltip')}
          </span>
        </label>
        <select
          id="wedding_country"
          value={formData.wedding_country || 'ES'}
          onChange={(e) => handleChange('wedding_country', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name} ({country.prefix})
            </option>
          ))}
        </select>
      </div>

      {/* WhatsApp Sending Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('planner.weddings.whatsappMode.label')}
        </label>
        <div className="space-y-2">
          <label className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
            formData.whatsapp_mode === WhatsAppMode.BUSINESS
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:bg-gray-50'
          }`}>
            <input
              type="radio"
              name="whatsapp_mode"
              value={WhatsAppMode.BUSINESS}
              checked={formData.whatsapp_mode === WhatsAppMode.BUSINESS}
              onChange={() => handleChange('whatsapp_mode', WhatsAppMode.BUSINESS)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('planner.weddings.whatsappMode.business')}</p>
              <p className="text-xs text-gray-500">{t('planner.weddings.whatsappMode.businessDesc')}</p>
            </div>
          </label>
          <label className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
            formData.whatsapp_mode === WhatsAppMode.LINKS
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:bg-gray-50'
          }`}>
            <input
              type="radio"
              name="whatsapp_mode"
              value={WhatsAppMode.LINKS}
              checked={formData.whatsapp_mode === WhatsAppMode.LINKS}
              onChange={() => handleChange('whatsapp_mode', WhatsAppMode.LINKS)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('planner.weddings.whatsappMode.links')}</p>
              <p className="text-xs text-gray-500">{t('planner.weddings.whatsappMode.linksDesc')}</p>
            </div>
          </label>
        </div>
      </div>

      {/* Note about additional settings */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-700">
          <strong>{t('planner.weddings.note.title')}</strong> {t('planner.weddings.note.content')}
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.buttons.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting 
            ? t('planner.weddings.buttons.saving') 
            : initialData 
              ? t('planner.weddings.buttons.update') 
              : t('planner.weddings.buttons.create')}
        </button>
      </div>
    </form>
  );
}
