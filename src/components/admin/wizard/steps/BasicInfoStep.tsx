'use client';

import { useState } from 'react';
import type { WeddingWithRelations } from '../WeddingWizard';

interface BasicInfoStepProps {
  wedding: WeddingWithRelations;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function BasicInfoStep({ wedding, onNext, onBack }: BasicInfoStepProps) {
  const [formData, setFormData] = useState({
    couple_names: wedding.couple_names || '',
    wedding_date: wedding.wedding_date
      ? new Date(wedding.wedding_date).toISOString().split('T')[0]
      : '',
    wedding_time: wedding.wedding_time || '',
    location: wedding.location || '',
    dress_code: wedding.dress_code || '',
    additional_info: wedding.additional_info || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/wedding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save wedding information');
      }

      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Basic Wedding Information</h2>
        <p className="mt-2 text-gray-600">
          Let's confirm the basic details about your wedding. You can always change these later.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Couple Names */}
        <div>
          <label htmlFor="couple_names" className="block text-sm font-medium text-gray-700">
            Couple Names <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="couple_names"
            name="couple_names"
            required
            value={formData.couple_names}
            onChange={handleChange}
            placeholder="e.g., John & Jane"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
          />
        </div>

        {/* Wedding Date */}
        <div>
          <label htmlFor="wedding_date" className="block text-sm font-medium text-gray-700">
            Wedding Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="wedding_date"
            name="wedding_date"
            required
            value={formData.wedding_date}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
          />
        </div>

        {/* Wedding Time */}
        <div>
          <label htmlFor="wedding_time" className="block text-sm font-medium text-gray-700">
            Wedding Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            id="wedding_time"
            name="wedding_time"
            required
            value={formData.wedding_time}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Venue / Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., Grand Hotel Ballroom"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
          />
          <p className="mt-1 text-sm text-gray-500">
            You can configure detailed locations and itinerary items later in the dashboard.
          </p>
        </div>

        {/* Dress Code */}
        <div>
          <label htmlFor="dress_code" className="block text-sm font-medium text-gray-700">
            Dress Code
          </label>
          <input
            type="text"
            id="dress_code"
            name="dress_code"
            value={formData.dress_code}
            onChange={handleChange}
            placeholder="e.g., Formal, Semi-Formal, Casual"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
          />
        </div>

        {/* Additional Info */}
        <div>
          <label htmlFor="additional_info" className="block text-sm font-medium text-gray-700">
            Additional Information
          </label>
          <textarea
            id="additional_info"
            name="additional_info"
            rows={4}
            value={formData.additional_info}
            onChange={handleChange}
            placeholder="Any additional details you'd like to share with your guests..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm px-4 py-2 border"
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <svg className="mr-2 -ml-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !formData.couple_names || !formData.wedding_date || !formData.wedding_time}
          className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save & Continue'}
          <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
