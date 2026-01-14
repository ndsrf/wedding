/**
 * Planner Form Component
 *
 * Form for creating new wedding planners
 * Validates email and logo URL inputs
 */

'use client';

import React, { useState } from 'react';
import { useNamespacedTranslations } from '@/src/lib/i18n/client';

interface PlannerFormData {
  name: string;
  email: string;
  logo_url: string;
}

interface PlannerFormProps {
  onSubmit: (data: PlannerFormData) => Promise<void>;
  onCancel: () => void;
}

export function PlannerForm({ onSubmit, onCancel }: PlannerFormProps) {
  const t = useNamespacedTranslations('master');
  const tCommon = useNamespacedTranslations('common');

  const [formData, setFormData] = useState<PlannerFormData>({
    name: '',
    email: '',
    logo_url: '',
  });

  const [errors, setErrors] = useState<Partial<PlannerFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<PlannerFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = tCommon('forms.required');
    }

    if (!formData.email.trim()) {
      newErrors.email = tCommon('forms.required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = tCommon('forms.invalidEmail');
    }

    if (formData.logo_url && !/^https?:\/\/.+/.test(formData.logo_url)) {
      newErrors.logo_url = 'Invalid URL format';
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
      // Reset form on success
      setFormData({ name: '', email: '', logo_url: '' });
      setErrors({});
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof PlannerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-base font-semibold text-gray-700 mb-2">
          {t('planners.name')} *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
            errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-purple-300'
          }`}
          placeholder="Enter planner name"
        />
        {errors.name && <p className="mt-2 text-sm text-red-600 font-medium">{errors.name}</p>}
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-base font-semibold text-gray-700 mb-2">
          {t('planners.email')} *
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          className={`w-full px-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
            errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-purple-300'
          }`}
          placeholder="planner@example.com"
        />
        {errors.email && <p className="mt-2 text-sm text-red-600 font-medium">{errors.email}</p>}
      </div>

      {/* Logo URL Field */}
      <div>
        <label htmlFor="logo_url" className="block text-base font-semibold text-gray-700 mb-2">
          {t('planners.logoUrl')} (optional)
        </label>
        <input
          id="logo_url"
          type="url"
          value={formData.logo_url}
          onChange={(e) => handleChange('logo_url', e.target.value)}
          className={`w-full px-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
            errors.logo_url ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-purple-300'
          }`}
          placeholder="https://example.com/logo.png"
        />
        {errors.logo_url && <p className="mt-2 text-sm text-red-600 font-medium">{errors.logo_url}</p>}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-3 text-base font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {tCommon('buttons.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 border-2 border-transparent rounded-xl hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? tCommon('loading') : tCommon('buttons.create')}
        </button>
      </div>
    </form>
  );
}
