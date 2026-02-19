/**
 * Wedding Form Component
 *
 * Form for creating and editing weddings
 * Includes all required fields and validation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { CreateWeddingRequest, ItineraryItemRequest } from '@/types/api';
import type { Theme, Wedding } from '@/types/models';
import { Language, LocationType, PaymentMode, WhatsAppMode } from '@prisma/client';
import { COUNTRIES } from '@/lib/phone-utils';
import { Plus, Trash2 } from 'lucide-react';

interface LocationOption {
  id: string;
  name: string;
  address?: string | null;
  google_maps_url?: string | null;
}

const ITEM_TYPE_LABELS: Record<LocationType, string> = {
  CEREMONY: 'Ceremony',
  EVENT: 'Event',
  PRE_EVENT: 'Pre-Event',
  POST_EVENT: 'Post-Event',
};

interface ItineraryEntry extends ItineraryItemRequest {
  _key: string; // local-only unique key for React rendering
}

interface WeddingFormData extends Omit<CreateWeddingRequest, 'wedding_date' | 'rsvp_cutoff_date' | 'itinerary'> {
  wedding_date: string;
  rsvp_cutoff_date: string;
}

interface WeddingFormProps {
  onSubmit: (data: CreateWeddingRequest) => Promise<void>;
  onCancel: () => void;
  initialData?: Wedding & { itinerary_items?: Array<{ id: string; location_id: string; item_type?: LocationType; date_time: Date | string; notes?: string | null; order: number }> };
  themes?: Theme[];
}

export function WeddingForm({ onSubmit, onCancel, initialData, themes = [] }: WeddingFormProps) {
  const t = useTranslations();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryEntry[]>(() => {
    if (initialData?.itinerary_items) {
      return initialData.itinerary_items.map((item) => ({
        _key: item.id,
        location_id: item.location_id,
        item_type: (item.item_type ?? 'EVENT') as LocationType,
        date_time: typeof item.date_time === 'string'
          ? item.date_time
          : new Date(item.date_time).toISOString().slice(0, 16),
        notes: item.notes ?? undefined,
        order: item.order,
      }));
    }
    return [];
  });

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
    main_event_location_id: initialData?.main_event_location_id || null,
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

  useEffect(() => {
    fetch('/api/planner/locations')
      .then((r) => r.json())
      .then((data) => setLocations(data.data || []))
      .catch(() => {});
  }, []);

  // Sync form data when initialData changes (important for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        couple_names: initialData.couple_names || '',
        wedding_date: initialData.wedding_date
          ? new Date(initialData.wedding_date).toISOString().split('T')[0]
          : '',
        wedding_time: initialData.wedding_time || '',
        location: initialData.location || '',
        main_event_location_id: initialData.main_event_location_id || null,
        rsvp_cutoff_date: initialData.rsvp_cutoff_date
          ? new Date(initialData.rsvp_cutoff_date).toISOString().split('T')[0]
          : '',
        dress_code: initialData.dress_code || '',
        additional_info: initialData.additional_info || '',
        theme_id: initialData.theme_id || undefined,
        payment_tracking_mode: initialData.payment_tracking_mode || PaymentMode.MANUAL,
        allow_guest_additions: initialData.allow_guest_additions ?? true,
        default_language: initialData.default_language || Language.ES,
        wedding_country: initialData.wedding_country || 'ES',
        whatsapp_mode: initialData.whatsapp_mode || WhatsAppMode.BUSINESS,
      });

      // Update itinerary when initialData changes
      if (initialData.itinerary_items) {
        setItinerary(
          initialData.itinerary_items.map((item) => ({
            _key: item.id,
            location_id: item.location_id,
            item_type: (item.item_type ?? 'EVENT') as LocationType,
            date_time:
              typeof item.date_time === 'string'
                ? item.date_time
                : new Date(item.date_time).toISOString().slice(0, 16),
            notes: item.notes ?? undefined,
            order: item.order,
          }))
        );
      }
    }
  }, [initialData]);

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

    if (formData.location !== undefined && formData.location !== null && !formData.location.trim()) {
      // location is optional now; only validate if provided as non-empty string
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
      await onSubmit({
        ...formData,
        itinerary: itinerary.map(({ _key, ...rest }) => rest),
      });
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItineraryItem = () => {
    setItinerary((prev) => [
      ...prev,
      {
        _key: `new-${Date.now()}`,
        location_id: '',
        item_type: 'EVENT' as LocationType,
        date_time: formData.wedding_date ? `${formData.wedding_date}T12:00` : '',
        notes: '',
        order: prev.length,
      },
    ]);
  };

  const removeItineraryItem = (key: string) => {
    setItinerary((prev) => prev.filter((i) => i._key !== key));
  };

  const updateItineraryItem = (key: string, field: string, value: string) => {
    setItinerary((prev) =>
      prev.map((item) => (item._key === key ? { ...item, [field]: value } : item))
    );
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

      {/* Main Event Location */}
      <div>
        <label htmlFor="main_event_location_id" className="block text-sm font-medium text-gray-700 mb-1">
          Main Event Location
        </label>
        {locations.length > 0 ? (
          <select
            id="main_event_location_id"
            value={formData.main_event_location_id || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, main_event_location_id: e.target.value || null }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— None —</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}{loc.address ? ` — ${loc.address}` : ''}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-gray-500 italic">
            No locations set up yet.{' '}
            <a href="/planner/locations" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              Add locations
            </a>{' '}
            in the Locations section first.
          </p>
        )}
      </div>

      {/* Itinerary */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Itinerary
          </label>
          <button
            type="button"
            onClick={addItineraryItem}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add stop
          </button>
        </div>
        {itinerary.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No itinerary items yet.</p>
        ) : (
          <div className="space-y-3">
            {itinerary.map((item) => (
              <div key={item._key} className="flex gap-2 items-start p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Venue</label>
                    <select
                      value={item.location_id}
                      onChange={(e) => updateItineraryItem(item._key, 'location_id', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">— Select venue —</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}{loc.address ? ` — ${loc.address}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Event Type</label>
                    <select
                      value={item.item_type}
                      onChange={(e) => updateItineraryItem(item._key, 'item_type', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {(Object.keys(ITEM_TYPE_LABELS) as LocationType[]).map((type) => (
                        <option key={type} value={type}>{ITEM_TYPE_LABELS[type]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date & Time</label>
                    <input
                      type="datetime-local"
                      value={item.date_time}
                      onChange={(e) => updateItineraryItem(item._key, 'date_time', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => updateItineraryItem(item._key, 'notes', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Cocktail hour, Dinner, Speeches…"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItineraryItem(item._key)}
                  className="mt-5 p-1 text-gray-400 hover:text-red-500"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
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
