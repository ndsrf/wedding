/**
 * Admin Invite Form Component
 *
 * Form for inviting wedding admins to manage a wedding
 * Validates email, name, and optional phone inputs
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { COUNTRIES, COUNTRY_PHONE_PREFIXES } from '@/lib/phone-utils';

interface AdminInviteFormData {
  name: string;
  email: string;
  phone: string;
}

interface AdminInviteFormProps {
  onSubmit: (data: AdminInviteFormData) => Promise<void>;
  onCancel: () => void;
  weddingCountry?: string;
}

export function AdminInviteForm({ onSubmit, onCancel, weddingCountry = 'ES' }: AdminInviteFormProps) {
  const t = useTranslations();

  // Default the prefix to the wedding country's prefix
  const defaultPrefix = COUNTRY_PHONE_PREFIXES[weddingCountry] ?? '+34';

  const [formData, setFormData] = useState<AdminInviteFormData>({
    name: '',
    email: '',
    phone: '',
  });
  const [phonePrefix, setPhonePrefix] = useState<string>(defaultPrefix);

  const [errors, setErrors] = useState<Partial<Record<keyof AdminInviteFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AdminInviteFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('planner.admins.validation.nameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('planner.admins.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('planner.admins.validation.invalidEmail');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[FORM DEBUG] handleSubmit called, formData:', formData);

    if (!validateForm()) {
      console.log('[FORM DEBUG] Validation failed');
      return;
    }

    console.log('[FORM DEBUG] Validation passed, calling onSubmit');
    setIsSubmitting(true);
    setSubmitError(null);

    // Build full phone: combine prefix + digits, or empty if no digits entered
    const phoneDigits = formData.phone.trim();
    const fullPhone = phoneDigits ? `${phonePrefix}${phoneDigits}` : '';

    try {
      await onSubmit({ ...formData, phone: fullPhone });
      console.log('[FORM DEBUG] onSubmit completed successfully');
      // Reset form on success
      setFormData({ name: '', email: '', phone: '' });
      setPhonePrefix(defaultPrefix);
      setErrors({});
    } catch (error: any) {
      console.error('[FORM DEBUG] Form submission error:', error);
      setSubmitError(error.message || t('planner.admins.inviteError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof AdminInviteFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md animate-in fade-in duration-200">
          <div className="flex gap-2 items-center text-red-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm font-medium">{submitError}</p>
          </div>
        </div>
      )}

      {/* Name Field */}
      <div>
        <label htmlFor="admin_name" className="block text-sm font-medium text-gray-700 mb-1">
          {t('planner.admins.name')} *
        </label>
        <input
          id="admin_name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t('planner.admins.namePlaceholder')}
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700 mb-1">
          {t('planner.admins.email')} *
        </label>
        <input
          id="admin_email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t('planner.admins.emailPlaceholder')}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      {/* Phone Field */}
      <div>
        <label htmlFor="admin_phone" className="block text-sm font-medium text-gray-700 mb-1">
          {t('planner.admins.phone')}
        </label>
        <div className="flex gap-2">
          <select
            value={phonePrefix}
            onChange={(e) => {
              setPhonePrefix(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            className="w-28 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.prefix}>
                {c.prefix} ({c.code})
              </option>
            ))}
          </select>
          <input
            id="admin_phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('planner.admins.phonePlaceholder')}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">{t('planner.admins.phoneHint')}</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4">
        <p className="text-sm text-blue-800">
          {t('planner.admins.invitationNote')}
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
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
          {isSubmitting ? t('planner.admins.sending') : t('planner.admins.send')}
        </button>
      </div>
    </form>
  );
}
