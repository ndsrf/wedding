/**
 * Planner Form Component
 *
 * Form for creating new wedding planners
 * Validates email and logo URL inputs
 */

'use client';

import React, { useState } from 'react';
import { useNamespacedTranslations } from '@/lib/i18n/client';

interface BillingSeriesConfig {
  invoice_series: string;
  rectification_series: string;
  proforma_series: string;
  invoice_start_number: string;
  rectification_start_number: string;
  proforma_start_number: string;
  last_external_hash: string;
}

interface PlannerFormData {
  name: string;
  email: string;
  logo_url: string;
  billing: BillingSeriesConfig;
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
    billing: {
      invoice_series: 'FAC',
      rectification_series: 'REC',
      proforma_series: 'PRO',
      invoice_start_number: '1',
      rectification_start_number: '1',
      proforma_start_number: '1',
      last_external_hash: '',
    },
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

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

    const invoiceStart = parseInt(formData.billing.invoice_start_number, 10);
    const rectStart = parseInt(formData.billing.rectification_start_number, 10);
    const proformaStart = parseInt(formData.billing.proforma_start_number, 10);

    if (!formData.billing.invoice_series.trim()) {
      newErrors.invoice_series = tCommon('forms.required');
    }
    if (!formData.billing.rectification_series.trim()) {
      newErrors.rectification_series = tCommon('forms.required');
    }
    if (!formData.billing.proforma_series.trim()) {
      newErrors.proforma_series = tCommon('forms.required');
    }
    if (isNaN(invoiceStart) || invoiceStart < 1) {
      newErrors.invoice_start_number = 'Debe ser un número mayor o igual a 1';
    }
    if (isNaN(rectStart) || rectStart < 1) {
      newErrors.rectification_start_number = 'Debe ser un número mayor o igual a 1';
    }
    if (isNaN(proformaStart) || proformaStart < 1) {
      newErrors.proforma_start_number = 'Debe ser un número mayor o igual a 1';
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
      setFormData({
        name: '',
        email: '',
        logo_url: '',
        billing: {
          invoice_series: 'FAC',
          rectification_series: 'REC',
          proforma_series: 'PRO',
          invoice_start_number: '1',
          rectification_start_number: '1',
          proforma_start_number: '1',
          last_external_hash: '',
        },
      });
      setErrors({});
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    if (field.startsWith('billing.')) {
      const billingField = field.slice('billing.'.length) as keyof BillingSeriesConfig;
      setFormData((prev) => ({
        ...prev,
        billing: { ...prev.billing, [billingField]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 border-2 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-purple-300'
    }`;

  const smallInputClass = (field: string) =>
    `w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-purple-300'
    }`;

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
          className={inputClass('name')}
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
          className={inputClass('email')}
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
          className={inputClass('logo_url')}
          placeholder="https://example.com/logo.png"
        />
        {errors.logo_url && <p className="mt-2 text-sm text-red-600 font-medium">{errors.logo_url}</p>}
      </div>

      {/* Billing Series Configuration */}
      <div className="border-2 border-gray-200 rounded-xl p-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-700">Configuración de Series de Facturación</h3>

        {/* Series names row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Serie Facturas
            </label>
            <input
              type="text"
              value={formData.billing.invoice_series}
              onChange={(e) => handleChange('billing.invoice_series', e.target.value.toUpperCase())}
              className={smallInputClass('invoice_series')}
              placeholder="FAC"
              maxLength={10}
            />
            {errors.invoice_series && <p className="mt-1 text-xs text-red-600">{errors.invoice_series}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Serie Rectificativas
            </label>
            <input
              type="text"
              value={formData.billing.rectification_series}
              onChange={(e) => handleChange('billing.rectification_series', e.target.value.toUpperCase())}
              className={smallInputClass('rectification_series')}
              placeholder="REC"
              maxLength={10}
            />
            {errors.rectification_series && <p className="mt-1 text-xs text-red-600">{errors.rectification_series}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Serie Proformas
            </label>
            <input
              type="text"
              value={formData.billing.proforma_series}
              onChange={(e) => handleChange('billing.proforma_series', e.target.value.toUpperCase())}
              className={smallInputClass('proforma_series')}
              placeholder="PRO"
              maxLength={10}
            />
            {errors.proforma_series && <p className="mt-1 text-xs text-red-600">{errors.proforma_series}</p>}
          </div>
        </div>

        {/* Start numbers row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Nº inicial Facturas
            </label>
            <input
              type="number"
              min={1}
              value={formData.billing.invoice_start_number}
              onChange={(e) => handleChange('billing.invoice_start_number', e.target.value)}
              className={smallInputClass('invoice_start_number')}
              placeholder="1"
            />
            {errors.invoice_start_number && <p className="mt-1 text-xs text-red-600">{errors.invoice_start_number}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Nº inicial Rectificativas
            </label>
            <input
              type="number"
              min={1}
              value={formData.billing.rectification_start_number}
              onChange={(e) => handleChange('billing.rectification_start_number', e.target.value)}
              className={smallInputClass('rectification_start_number')}
              placeholder="1"
            />
            {errors.rectification_start_number && <p className="mt-1 text-xs text-red-600">{errors.rectification_start_number}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Nº inicial Proformas
            </label>
            <input
              type="number"
              min={1}
              value={formData.billing.proforma_start_number}
              onChange={(e) => handleChange('billing.proforma_start_number', e.target.value)}
              className={smallInputClass('proforma_start_number')}
              placeholder="1"
            />
            {errors.proforma_start_number && <p className="mt-1 text-xs text-red-600">{errors.proforma_start_number}</p>}
          </div>
        </div>

        {/* Last External Hash */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Último Hash Externo{' '}
            <span className="font-normal text-gray-400">(opcional — para continuidad Verifactu desde otro software)</span>
          </label>
          <input
            type="text"
            value={formData.billing.last_external_hash}
            onChange={(e) => handleChange('billing.last_external_hash', e.target.value)}
            className={smallInputClass('last_external_hash')}
            placeholder="Hash SHA-256 de la última factura en el sistema anterior"
          />
        </div>
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
