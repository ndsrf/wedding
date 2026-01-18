/**
 * Wedding Form Component
 *
 * Form for creating and editing weddings
 * Includes all required fields and validation
 */

'use client';

import React, { useState } from 'react';
import type { CreateWeddingRequest } from '@/types/api';
import type { Theme, Wedding } from '@/types/models';
import { Language, PaymentMode } from '@prisma/client';

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
  });

  const [errors, setErrors] = useState<Partial<Record<keyof WeddingFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof WeddingFormData, string>> = {};

    if (!formData.couple_names.trim()) {
      newErrors.couple_names = 'Couple names are required';
    }

    if (!formData.wedding_date) {
      newErrors.wedding_date = 'Wedding date is required';
    }

    if (!formData.wedding_time.trim()) {
      newErrors.wedding_time = 'Wedding time is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.rsvp_cutoff_date) {
      newErrors.rsvp_cutoff_date = 'RSVP cutoff date is required';
    } else if (
      formData.wedding_date &&
      new Date(formData.rsvp_cutoff_date) >= new Date(formData.wedding_date)
    ) {
      newErrors.rsvp_cutoff_date = 'RSVP cutoff must be before the wedding date';
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
          Couple Names *
        </label>
        <input
          id="couple_names"
          type="text"
          value={formData.couple_names}
          onChange={(e) => handleChange('couple_names', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.couple_names ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="John & Jane"
        />
        {errors.couple_names && <p className="mt-1 text-sm text-red-600">{errors.couple_names}</p>}
      </div>

      {/* Wedding Date and Time */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="wedding_date" className="block text-sm font-medium text-gray-700 mb-1">
            Wedding Date *
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
            Wedding Time *
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
          Location *
        </label>
        <input
          id="location"
          type="text"
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.location ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Venue name and address"
        />
        {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
      </div>

      {/* RSVP Cutoff Date */}
      <div>
        <label htmlFor="rsvp_cutoff_date" className="block text-sm font-medium text-gray-700 mb-1">
          RSVP Cutoff Date *
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
            Theme (optional)
          </label>
          <select
            id="theme_id"
            value={formData.theme_id || ''}
            onChange={(e) => handleChange('theme_id', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No theme</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name} {theme.is_system_theme ? '(System)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Default Language */}
      <div>
        <label htmlFor="default_language" className="block text-sm font-medium text-gray-700 mb-1">
          Default Language *
        </label>
        <select
          id="default_language"
          value={formData.default_language}
          onChange={(e) => handleChange('default_language', e.target.value as Language)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={Language.ES}>Spanish (Español)</option>
          <option value={Language.EN}>English</option>
          <option value={Language.FR}>French (Français)</option>
          <option value={Language.IT}>Italian (Italiano)</option>
          <option value={Language.DE}>German (Deutsch)</option>
        </select>
      </div>

      {/* Note about additional settings */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Additional settings like payment mode, guest additions, dress code,
          and RSVP questions can be configured by the wedding admin in the wedding dashboard
          after the wedding is created.
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
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Update Wedding' : 'Create Wedding'}
        </button>
      </div>
    </form>
  );
}
