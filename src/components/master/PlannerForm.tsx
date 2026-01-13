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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          {t('planners.name')} *
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter planner name"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          {t('planners.email')} *
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="planner@example.com"
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      {/* Logo URL Field */}
      <div>
        <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-1">
          {t('planners.logoUrl')} (optional)
        </label>
        <input
          id="logo_url"
          type="url"
          value={formData.logo_url}
          onChange={(e) => handleChange('logo_url', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.logo_url ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="https://example.com/logo.png"
        />
        {errors.logo_url && <p className="mt-1 text-sm text-red-600">{errors.logo_url}</p>}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {tCommon('buttons.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? tCommon('loading') : tCommon('buttons.create')}
        </button>
      </div>
    </form>
  );
}
